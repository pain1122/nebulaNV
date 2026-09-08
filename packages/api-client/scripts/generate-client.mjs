import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");
const openApiPath = path.join(
  repositoryRoot,
  "apps",
  "gateway",
  "openapi",
  "nebula-v1.openapi.json",
);
const generatedPath = path.join(packageRoot, "src", "generated.ts");
const HTTP_METHODS = [
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
];
const CLIENT_HEADER = "x-nebula-client-id";
const IDEMPOTENCY_HEADER = "idempotency-key";

function fail(message) {
  throw new Error(`api_client_generation_${message}`);
}

function schemaReference(reference) {
  const prefix = "#/components/schemas/";
  if (!reference.startsWith(prefix)) fail("unsupported_schema_reference");
  const name = reference.slice(prefix.length);
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name)) {
    fail("invalid_schema_identifier");
  }
  return name;
}

function literal(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  return "unknown";
}

function objectType(properties = {}, requiredNames = []) {
  const required = new Set(requiredNames);
  const fields = Object.entries(properties)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([name, schema]) =>
        `  readonly ${JSON.stringify(name)}${required.has(name) ? "" : "?"}: ${schemaType(schema)};`,
    );
  return fields.length === 0
    ? "Readonly<Record<never, never>>"
    : `Readonly<{\n${fields.join("\n")}\n}>`;
}

function schemaType(schema = {}) {
  let rendered;
  if (schema.$ref) {
    rendered = schemaReference(schema.$ref);
  } else if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    rendered = schema.enum.map(literal).join(" | ");
  } else if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    rendered = schema.oneOf.map(schemaType).join(" | ");
  } else if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    rendered = schema.anyOf.map(schemaType).join(" | ");
  } else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    rendered = schema.allOf.map(schemaType).join(" & ");
  } else if (schema.type === "array") {
    rendered = `ReadonlyArray<${schemaType(schema.items ?? {})}>`;
  } else if (schema.type === "object" || schema.properties) {
    const properties = objectType(schema.properties, schema.required);
    if (schema.additionalProperties) {
      const value =
        schema.additionalProperties === true
          ? "unknown"
          : schemaType(schema.additionalProperties);
      rendered = `${properties} & Readonly<Record<string, ${value}>>`;
    } else {
      rendered = properties;
    }
  } else if (schema.type === "integer" || schema.type === "number") {
    rendered = "number";
  } else if (schema.type === "boolean") {
    rendered = "boolean";
  } else if (schema.type === "string" && schema.format === "binary") {
    rendered = "ArrayBuffer";
  } else if (schema.type === "string") {
    rendered = "string";
  } else {
    rendered = "unknown";
  }
  return schema.nullable ? `(${rendered}) | null` : rendered;
}

function parameterObject(parameters, location) {
  const selected = parameters.filter((parameter) => parameter.in === location);
  const properties = Object.fromEntries(
    selected.map((parameter) => [parameter.name, parameter.schema ?? {}]),
  );
  return objectType(
    properties,
    selected
      .filter((parameter) => parameter.required)
      .map((parameter) => parameter.name),
  );
}

function successResponse(operation) {
  const success = Object.entries(operation.responses ?? {})
    .filter(([status]) => /^2\d\d$/u.test(status))
    .sort(([left], [right]) => Number(left) - Number(right))[0]?.[1];
  if (!success) fail(`success_response_missing_${operation.operationId}`);
  const content = success.content ?? {};
  if (content["application/json"]?.schema) {
    return {
      kind: "json",
      type: schemaType(content["application/json"].schema),
    };
  }
  if (content["application/octet-stream"]?.schema) {
    return { kind: "binary", type: "ArrayBuffer" };
  }
  return { kind: "json", type: "undefined" };
}

function operations(document) {
  const result = [];
  const ids = new Set();
  for (const [routePath, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const id = operation.operationId;
      if (!id || ids.has(id)) fail("operation_id_missing_or_duplicate");
      ids.add(id);
      const parameters = operation.parameters ?? [];
      if (parameters.some((parameter) => parameter.$ref)) {
        fail(`parameter_reference_unsupported_${id}`);
      }
      const keys = parameters.map(
        (parameter) => `${parameter.in}:${parameter.name}`,
      );
      if (new Set(keys).size !== keys.length) fail(`duplicate_parameter_${id}`);
      const headers = parameters.filter(
        (parameter) => parameter.in === "header",
      );
      const headerNames = new Set(
        headers.map((parameter) => parameter.name.toLowerCase()),
      );
      if (!headerNames.has(CLIENT_HEADER)) fail(`client_header_missing_${id}`);
      if (
        [...headerNames].some(
          (name) => name !== CLIENT_HEADER && name !== IDEMPOTENCY_HEADER,
        )
      ) {
        fail(`unsupported_header_${id}`);
      }
      const bodySchema =
        operation.requestBody?.content?.["application/json"]?.schema;
      const response = successResponse(operation);
      result.push({
        id,
        method: method.toUpperCase(),
        path: routePath,
        pathType: parameterObject(parameters, "path"),
        queryType: parameterObject(parameters, "query"),
        bodyType: bodySchema ? schemaType(bodySchema) : "never",
        bodyRequired: Boolean(operation.requestBody?.required),
        requiresAccessToken:
          Array.isArray(operation.security) && operation.security.length > 0,
        requiresIdempotencyKey: headerNames.has(IDEMPOTENCY_HEADER),
        responseKind: response.kind,
        responseType: response.type,
      });
    }
  }
  return result.sort((left, right) => left.id.localeCompare(right.id));
}

function render(document) {
  if (
    typeof document.openapi !== "string" ||
    !document.openapi.startsWith("3.")
  ) {
    fail("openapi_3_required");
  }
  const schemas = Object.entries(document.components?.schemas ?? {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  const routeOperations = operations(document);
  const schemaTypes = schemas
    .map(([name, schema]) => `export type ${name} = ${schemaType(schema)};`)
    .join("\n\n");
  const operationTypes = routeOperations
    .map(
      (operation) =>
        `  readonly ${JSON.stringify(operation.id)}: Readonly<{\n` +
        `    method: ${JSON.stringify(operation.method)};\n` +
        `    pathTemplate: ${JSON.stringify(operation.path)};\n` +
        `    path: ${operation.pathType};\n` +
        `    query: ${operation.queryType};\n` +
        `    body: ${operation.bodyType};\n` +
        `    bodyRequired: ${operation.bodyRequired};\n` +
        `    requiresAccessToken: ${operation.requiresAccessToken};\n` +
        `    requiresIdempotencyKey: ${operation.requiresIdempotencyKey};\n` +
        `    responseKind: ${JSON.stringify(operation.responseKind)};\n` +
        `    response: ${operation.responseType};\n` +
        "  }>;",
    )
    .join("\n");
  const runtimeOperations = routeOperations
    .map(
      (operation) =>
        `  ${JSON.stringify(operation.id)}: {\n` +
        `    method: ${JSON.stringify(operation.method)},\n` +
        `    pathTemplate: ${JSON.stringify(operation.path)},\n` +
        `    bodyRequired: ${operation.bodyRequired},\n` +
        `    requiresAccessToken: ${operation.requiresAccessToken},\n` +
        `    requiresIdempotencyKey: ${operation.requiresIdempotencyKey},\n` +
        `    responseKind: ${JSON.stringify(operation.responseKind)},\n` +
        "  },",
    )
    .join("\n");

  return (
    `// Generated from apps/gateway/openapi/nebula-v1.openapi.json.\n` +
    `// Run \`pnpm --filter @nebula/api-client generate\`; do not edit by hand.\n\n` +
    `${schemaTypes}\n\n` +
    `export interface GatewayOperationMap {\n${operationTypes}\n}\n\n` +
    `export type GatewayOperationId = keyof GatewayOperationMap;\n\n` +
    `export type GatewayRuntimeOperation = Readonly<{\n` +
    `  method: string;\n` +
    `  pathTemplate: string;\n` +
    `  bodyRequired: boolean;\n` +
    `  requiresAccessToken: boolean;\n` +
    `  requiresIdempotencyKey: boolean;\n` +
    `  responseKind: "json" | "binary";\n` +
    `}>;\n\n` +
    `export const gatewayOperations = {\n${runtimeOperations}\n` +
    `} as const satisfies Readonly<Record<GatewayOperationId, GatewayRuntimeOperation>>;\n`
  );
}

async function main() {
  const document = JSON.parse(await readFile(openApiPath, "utf8"));
  const generated = render(document);
  if (!process.argv.includes("--check")) {
    await writeFile(generatedPath, generated, "utf8");
    return;
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "nebula-api-client-check-"),
  );
  const temporaryFile = path.join(temporaryDirectory, "generated.ts");
  try {
    await writeFile(temporaryFile, generated, "utf8");
    const [expected, candidate] = await Promise.all([
      readFile(generatedPath, "utf8"),
      readFile(temporaryFile, "utf8"),
    ]);
    if (expected !== candidate) fail("generated_client_stale");
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "api_client_generation_failed"}\n`,
  );
  process.exitCode = 1;
});
