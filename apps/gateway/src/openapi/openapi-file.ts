import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  generateGatewayOpenApiDocument,
  serializeGatewayOpenApiDocument,
} from "./gateway-openapi";

export const GATEWAY_OPENAPI_FILE = resolve(
  __dirname,
  "../../openapi/nebula-v1.openapi.json",
);

export async function renderedGatewayOpenApi(): Promise<string> {
  return serializeGatewayOpenApiDocument(
    await generateGatewayOpenApiDocument(),
  );
}

export async function writeGatewayOpenApi(
  destination = GATEWAY_OPENAPI_FILE,
): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, await renderedGatewayOpenApi(), "utf8");
}

export async function checkGatewayOpenApi(
  expectedFile = GATEWAY_OPENAPI_FILE,
): Promise<void> {
  const [expected, rendered] = await Promise.all([
    readFile(expectedFile, "utf8"),
    renderedGatewayOpenApi(),
  ]);
  if (expected !== rendered) throw new Error("gateway_openapi_document_stale");
}

if (require.main === module) {
  const operation = process.argv.includes("--check")
    ? checkGatewayOpenApi()
    : writeGatewayOpenApi();
  void operation.catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown_error";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
