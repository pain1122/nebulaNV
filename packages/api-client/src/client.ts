import {
  gatewayOperations,
  type GatewayErrorEnvelopeDto,
  type GatewayOperationId,
  type GatewayOperationMap,
} from "./generated";

export interface GatewayHeaderReader {
  get(name: string): string | null;
}

export interface GatewayFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly headers: GatewayHeaderReader;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface GatewayFetchInit {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly credentials?: "omit" | "same-origin" | "include";
  readonly signal?: unknown;
}

export type GatewayFetch = (
  url: string,
  init: GatewayFetchInit,
) => Promise<GatewayFetchResponse>;

export interface GatewayClientOptions {
  /** The only API origin/base configured by a web or mobile consumer. */
  readonly baseUrl: string;
  /** Registered public identifier. It is routing context, never a secret. */
  readonly publicClientId: string;
  readonly fetch?: GatewayFetch;
  readonly accessToken?: () =>
    | string
    | undefined
    | Promise<string | undefined>;
  /** Exact browser origin forwarded only by a trusted server-side BFF call. */
  readonly applicationOrigin?: string;
  readonly credentials?: "omit" | "same-origin" | "include";
}

type Operation<Id extends GatewayOperationId> = GatewayOperationMap[Id];
type RequiredKeys<Value> = {
  [Key in keyof Value]-?: undefined extends Value[Key] ? never : Key;
}[keyof Value];
type PathPart<Id extends GatewayOperationId> = keyof Operation<Id>["path"] extends never
  ? unknown
  : { readonly path: Operation<Id>["path"] };
type QueryPart<Id extends GatewayOperationId> = keyof Operation<Id>["query"] extends never
  ? unknown
  : RequiredKeys<Operation<Id>["query"]> extends never
    ? { readonly query?: Operation<Id>["query"] }
    : { readonly query: Operation<Id>["query"] };
type BodyPart<Id extends GatewayOperationId> = Operation<Id>["body"] extends never
  ? unknown
  : Operation<Id>["bodyRequired"] extends true
    ? { readonly body: Operation<Id>["body"] }
    : { readonly body?: Operation<Id>["body"] };
type IdempotencyPart<Id extends GatewayOperationId> = Operation<Id>["requiresIdempotencyKey"] extends true
  ? { readonly idempotencyKey: string }
  : unknown;

export type GatewayOperationRequest<Id extends GatewayOperationId> = PathPart<Id> &
  QueryPart<Id> &
  BodyPart<Id> &
  IdempotencyPart<Id> & {
    readonly accessToken?: string;
    /** Server-side BFF forwarding only; browsers cannot set Cookie directly. */
    readonly browserCookie?: string;
    readonly signal?: unknown;
  };

type GatewayRequestArguments<Id extends GatewayOperationId> = Record<
  never,
  never
> extends GatewayOperationRequest<Id>
  ? [request?: GatewayOperationRequest<Id>]
  : [request: GatewayOperationRequest<Id>];

export type GatewaySuccess<Response> = Readonly<{
  ok: true;
  status: number;
  data: Response;
  headers: GatewayHeaderReader;
  requestId?: string;
}>;

export type GatewayFailure = Readonly<{
  ok: false;
  status: number;
  error: GatewayErrorEnvelopeDto | unknown;
  headers: GatewayHeaderReader;
  requestId?: string;
}>;

export type GatewayResult<Response> = GatewaySuccess<Response> | GatewayFailure;

export interface GatewayClient {
  request<Id extends GatewayOperationId>(
    operationId: Id,
    ...args: GatewayRequestArguments<Id>
  ): Promise<GatewayResult<Operation<Id>["response"]>>;
}

const PUBLIC_CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function normalizedBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/u, "");
  if (!normalized || /[?#]/u.test(normalized)) {
    throw new Error("gateway_base_url_invalid");
  }
  return normalized;
}

function runtimeFetch(configured?: GatewayFetch): GatewayFetch {
  if (configured) return configured;
  const candidate = (globalThis as { fetch?: GatewayFetch }).fetch;
  if (!candidate) throw new Error("gateway_fetch_unavailable");
  return candidate.bind(globalThis);
}

function withPathParameters(
  template: string,
  values: Readonly<Record<string, unknown>>,
): string {
  return template.replace(/\{([^}]+)\}/gu, (_match, name: string) => {
    const value = values[name];
    if (value === undefined || value === null || value === "") {
      throw new Error(`gateway_path_parameter_required:${name}`);
    }
    return encodeURIComponent(String(value));
  });
}

function withQuery(
  url: string,
  values: Readonly<Record<string, unknown>>,
): string {
  const entries: string[] = [];
  for (const [name, raw] of Object.entries(values).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (raw === undefined || raw === null) continue;
    const valuesForName = Array.isArray(raw) ? raw : [raw];
    for (const value of valuesForName) {
      entries.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return entries.length === 0 ? url : `${url}?${entries.join("&")}`;
}

async function responseBody(
  response: GatewayFetchResponse,
  responseKind: "json" | "binary",
): Promise<unknown> {
  if (response.ok && responseKind === "binary") {
    return response.arrayBuffer();
  }
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createGatewayClient(options: GatewayClientOptions): GatewayClient {
  const baseUrl = normalizedBaseUrl(options.baseUrl);
  const publicClientId = options.publicClientId.trim();
  if (!PUBLIC_CLIENT_ID_PATTERN.test(publicClientId)) {
    throw new Error("gateway_public_client_id_invalid");
  }
  const fetchImpl = runtimeFetch(options.fetch);

  return {
    async request<Id extends GatewayOperationId>(
      operationId: Id,
      ...args: GatewayRequestArguments<Id>
    ): Promise<GatewayResult<Operation<Id>["response"]>> {
      const operation = gatewayOperations[operationId];
      const request = (args[0] ?? {}) as GatewayOperationRequest<Id>;
      const pathValues = ("path" in request ? request.path : {}) as Readonly<
        Record<string, unknown>
      >;
      const queryValues = ("query" in request ? request.query : {}) as Readonly<
        Record<string, unknown>
      >;
      const headers: Record<string, string> = {
        Accept: operation.responseKind === "binary" ? "application/octet-stream" : "application/json",
        "X-Nebula-Client-ID": publicClientId,
      };

      if (options.applicationOrigin?.trim()) {
        headers.Origin = options.applicationOrigin.trim();
        headers["Sec-Fetch-Site"] = "same-origin";
      }
      if ("browserCookie" in request && request.browserCookie) {
        headers.Cookie = request.browserCookie;
      }
      if (operation.requiresIdempotencyKey) {
        const key =
          "idempotencyKey" in request
            ? String(request.idempotencyKey ?? "")
            : "";
        if (!key) throw new Error("gateway_idempotency_key_required");
        headers["Idempotency-Key"] = key;
      }

      const explicitToken = "accessToken" in request ? request.accessToken : undefined;
      const accessToken = explicitToken ?? (await options.accessToken?.());
      if (operation.requiresAccessToken && !accessToken) {
        throw new Error("gateway_access_token_required");
      }
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      let body: string | undefined;
      if ("body" in request && request.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(request.body);
      } else if (operation.bodyRequired) {
        throw new Error("gateway_request_body_required");
      }

      const path = withPathParameters(operation.pathTemplate, pathValues);
      const url = withQuery(`${baseUrl}${path}`, queryValues);
      const response = await fetchImpl(url, {
        method: operation.method,
        headers,
        ...(body === undefined ? {} : { body }),
        ...(options.credentials ? { credentials: options.credentials } : {}),
        ...(request.signal === undefined ? {} : { signal: request.signal }),
      });
      const parsed = await responseBody(response, operation.responseKind);
      const requestId = response.headers.get("x-request-id") ?? undefined;
      return response.ok
        ? {
            ok: true,
            status: response.status,
            data: parsed as Operation<Id>["response"],
            headers: response.headers,
            ...(requestId ? { requestId } : {}),
          }
        : {
            ok: false,
            status: response.status,
            error: parsed,
            headers: response.headers,
            ...(requestId ? { requestId } : {}),
          };
    },
  };
}
