import type { PublicApplicationProfile } from "../../application/application.contracts";

export type GatewayInputLocation = "body" | "query" | "params";
export type GatewayInputIssueCode =
  | "invalid_container"
  | "unknown_field"
  | "required_field"
  | "unsupported_combination"
  | "unsupported_value"
  | "too_many_items";

export type GatewayInputIssue = Readonly<{
  field: string;
  code: GatewayInputIssueCode;
}>;

export type GatewayInputRule =
  | Readonly<{
      kind: "requires";
      location: GatewayInputLocation;
      field: string;
      required: readonly string[];
    }>
  | Readonly<{
      kind: "at-least-one";
      location: GatewayInputLocation;
      fields: readonly string[];
    }>
  | Readonly<{
      kind: "max-items";
      location: GatewayInputLocation;
      field: string;
      maximum: number;
    }>
  | Readonly<{
      kind: "application-only-fields";
      location: GatewayInputLocation;
      applications: readonly PublicApplicationProfile[];
      fields: readonly string[];
    }>
  | Readonly<{
      kind: "setting-allowlist";
      allowed: readonly string[];
    }>;

export type GatewayInputProfile = Readonly<{
  body: readonly string[];
  query: readonly string[];
  params: readonly string[];
  requiredBody: readonly string[];
  requiredQuery: readonly string[];
  requiredParams: readonly string[];
  rules: readonly GatewayInputRule[];
}>;

export type GatewayInputProfileGroup = Readonly<
  Record<string, GatewayInputProfile>
>;

export type GatewayExternalInput = Readonly<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
  applicationProfile?: PublicApplicationProfile;
}>;

export function profile(
  input: Partial<GatewayInputProfile> = {},
): GatewayInputProfile {
  return Object.freeze({
    body: Object.freeze([...(input.body ?? [])]),
    query: Object.freeze([...(input.query ?? [])]),
    params: Object.freeze([...(input.params ?? [])]),
    requiredBody: Object.freeze([...(input.requiredBody ?? [])]),
    requiredQuery: Object.freeze([...(input.requiredQuery ?? [])]),
    requiredParams: Object.freeze([...(input.requiredParams ?? [])]),
    rules: Object.freeze([...(input.rules ?? [])]),
  });
}

export function assertUniqueInputProfileNames(
  groups: readonly GatewayInputProfileGroup[],
): void {
  const names = new Set<string>();
  for (const group of groups) {
    for (const name of Object.keys(group)) {
      if (names.has(name)) {
        throw new Error(`gateway_input_profile_duplicate:${name}`);
      }
      names.add(name);
    }
  }
}

function asInputRecord(
  value: unknown,
  location: GatewayInputLocation,
  issues: GatewayInputIssue[],
): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    issues.push({ field: location, code: "invalid_container" });
    return {};
  }
  return value as Record<string, unknown>;
}

function hasValue(record: Record<string, unknown>, field: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(record, field) &&
    record[field] !== undefined
  );
}

function validateLocation(
  location: GatewayInputLocation,
  record: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  issues: GatewayInputIssue[],
): void {
  const allow = new Set(allowed);
  for (const field of Object.keys(record)) {
    if (!allow.has(field)) {
      issues.push({ field: `${location}.${field}`, code: "unknown_field" });
    }
  }
  for (const field of required) {
    if (!hasValue(record, field)) {
      issues.push({ field: `${location}.${field}`, code: "required_field" });
    }
  }
}

export function validateInputProfile(
  profileDefinition: GatewayInputProfile,
  input: GatewayExternalInput,
): readonly GatewayInputIssue[] {
  const issues: GatewayInputIssue[] = [];
  const locations: Record<GatewayInputLocation, Record<string, unknown>> = {
    body: asInputRecord(input.body, "body", issues),
    query: asInputRecord(input.query, "query", issues),
    params: asInputRecord(input.params, "params", issues),
  };

  validateLocation(
    "body",
    locations.body,
    profileDefinition.body,
    profileDefinition.requiredBody,
    issues,
  );
  validateLocation(
    "query",
    locations.query,
    profileDefinition.query,
    profileDefinition.requiredQuery,
    issues,
  );
  validateLocation(
    "params",
    locations.params,
    profileDefinition.params,
    profileDefinition.requiredParams,
    issues,
  );

  for (const rule of profileDefinition.rules) {
    if (rule.kind === "requires") {
      const record = locations[rule.location];
      if (hasValue(record, rule.field)) {
        for (const required of rule.required) {
          if (!hasValue(record, required)) {
            issues.push({
              field: `${rule.location}.${required}`,
              code: "unsupported_combination",
            });
          }
        }
      }
    } else if (rule.kind === "at-least-one") {
      const record = locations[rule.location];
      if (!rule.fields.some((field) => hasValue(record, field))) {
        issues.push({
          field: `${rule.location}.${rule.fields.join("|")}`,
          code: "required_field",
        });
      }
    } else if (rule.kind === "max-items") {
      const value = locations[rule.location][rule.field];
      if (Array.isArray(value) && value.length > rule.maximum) {
        issues.push({
          field: `${rule.location}.${rule.field}`,
          code: "too_many_items",
        });
      }
    } else if (rule.kind === "application-only-fields") {
      if (
        input.applicationProfile &&
        !rule.applications.includes(input.applicationProfile)
      ) {
        for (const field of rule.fields) {
          if (hasValue(locations[rule.location], field)) {
            issues.push({
              field: `${rule.location}.${field}`,
              code: "unsupported_combination",
            });
          }
        }
      }
    } else {
      const ns = locations.params.ns;
      const key = locations.params.key;
      if (
        typeof ns === "string" &&
        typeof key === "string" &&
        !rule.allowed.includes(`${ns}/${key}`)
      ) {
        issues.push({ field: "params.key", code: "unsupported_value" });
      }
    }
  }

  return Object.freeze(
    issues
      .sort((left, right) =>
        `${left.field}:${left.code}`.localeCompare(
          `${right.field}:${right.code}`,
        ),
      )
      .filter(
        (issue, index, all) =>
          index === 0 ||
          issue.field !== all[index - 1]?.field ||
          issue.code !== all[index - 1]?.code,
      ),
  );
}
