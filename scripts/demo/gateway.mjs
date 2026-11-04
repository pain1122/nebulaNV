import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import process from "node:process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { setTimeout as delay } from "node:timers/promises";
import { createGatewayClient } from "../../packages/api-client/dist/index.js";

export function createDemoRequestLimiter({
  sleep = delay,
  now = Date.now,
  log = console.log,
} = {}) {
  let notBefore = 0;
  function seconds(result, name) {
    const value =
      result.headers?.get(`${name}-gateway`) ?? result.headers?.get(name);
    if (!value || !/^\d+(?:\.\d+)?$/u.test(value)) return undefined;
    return Number(value);
  }
  return async (request) => {
    const deadline = now() + 180_000;
    for (let retries = 0; ; retries += 1) {
      const wait = Math.max(0, notBefore - now());
      if (wait) {
        if (now() + wait > deadline)
          throw new Error("demo_rate_limit_wait_budget_exceeded");
        log(`[demo-d1] Gateway rate limit: waiting ${Math.ceil(wait / 1000)}s`);
        for (let remaining = wait; remaining > 0; remaining -= 10_000) {
          await sleep(Math.min(10_000, remaining));
        }
      }
      const result = await request();
      if (
        result.status !== 429 ||
        result.error?.error?.code !== "RATE_LIMITED"
      ) {
        if (seconds(result, "x-ratelimit-remaining") === 0) {
          const reset = seconds(result, "x-ratelimit-reset");
          if (reset !== undefined) notBefore = now() + reset * 1000 + 250;
        }
        return result;
      }
      const retry = seconds(result, "retry-after");
      if (
        retries >= 3 ||
        retry === undefined ||
        now() + retry * 1000 + 250 > deadline
      )
        return result;
      notBefore = now() + retry * 1000 + 250;
    }
  };
}

export function unwrapGatewayResult(operation, result) {
  if (!result.ok) {
    const error = result.error?.error;
    throw new Error(
      `demo_${operation}_http_${result.status}_${error?.code ?? "failed"} ${JSON.stringify(
        {
          message: error?.message,
          details: error?.details,
          requestId: result.requestId ?? result.error?.requestId,
        },
      )}`,
    );
  }
  return result.data.data;
}

export function validateTarget(env) {
  if (
    String(env.NODE_ENV ?? "")
      .trim()
      .toLowerCase() === "production"
  )
    throw new Error("demo_refused_in_production");
  const target = new URL(
    env.NEBULA_LIVE_GATEWAY_BASE_URL ?? "http://127.0.0.1:3002",
  );
  if (
    target.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    !["", "/"].includes(target.pathname)
  )
    throw new Error("demo_requires_local_gateway");
  return target.origin;
}

export async function connectGateway(
  env = process.env,
  {
    limitRequest = createDemoRequestLimiter(),
    customer: customerCredentials,
  } = {},
) {
  const baseUrl = validateTarget(env);
  const admin = createGatewayClient({
    baseUrl,
    publicClientId: "admin-web-local",
    applicationOrigin: "http://localhost:3000",
  });
  const storefront = createGatewayClient({
    baseUrl,
    publicClientId: "storefront-web-local",
    applicationOrigin: "http://localhost:3008",
  });
  const customer = createGatewayClient({
    baseUrl,
    publicClientId: "mobile-local",
  });
  const sessions = [];
  const request = (client, operation, input) =>
    limitRequest(() =>
      client.request(operation, {
        ...input,
        signal: globalThis.AbortSignal.timeout(30_000),
      }),
    );
  async function login(identifier, password) {
    const result = await request(admin, "auth_login", {
      body: { identifier, password },
    });
    const token = unwrapGatewayResult("login", result).accessToken;
    const cookie = result.headers.get("set-cookie")?.split(";", 1)[0];
    if (!token || !cookie) throw new Error("demo_login_session_invalid");
    sessions.push({ token, cookie, client: admin });
    return token;
  }
  const token = await login(
    env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    env.SEED_ADMIN_PASS ?? "Admin123!",
  );
  let userToken;
  let customerSession;
  async function ensureCustomer() {
    if (customerSession) return customerSession;
    if (!customerCredentials?.email || !customerCredentials?.password)
      throw new Error("demo_customer_credentials_missing");
    let result = await request(customer, "auth_login", {
      body: {
        identifier: customerCredentials.email,
        password: customerCredentials.password,
      },
    });
    if (result.status === 401) {
      unwrapGatewayResult(
        "customer_register",
        await request(customer, "auth_register", {
          body: {
            email: customerCredentials.email,
            password: customerCredentials.password,
          },
          idempotencyKey: randomUUID(),
        }),
      );
      result = await request(customer, "auth_login", {
        body: {
          identifier: customerCredentials.email,
          password: customerCredentials.password,
        },
      });
    }
    const data = unwrapGatewayResult("customer_login", result);
    if (!data.accessToken || !data.refreshToken)
      throw new Error("demo_customer_session_invalid");
    const session = {
      token: data.accessToken,
      refreshToken: data.refreshToken,
      client: customer,
    };
    sessions.push(session);
    const profile = unwrapGatewayResult(
      "customer_me",
      await request(customer, "auth_me", {
        accessToken: session.token,
      }),
    );
    if (
      profile.role !== "user" ||
      profile.email?.toLowerCase() !== customerCredentials.email.toLowerCase()
    )
      throw new Error("demo_customer_identity_invalid");
    customerSession = { ...session, profile };
    return customerSession;
  }
  const api = {
    baseUrl,
    async customer() {
      return (await ensureCustomer()).profile;
    },
    async result(operation, input = {}, identity = "admin") {
      if (!["admin", "anonymous", "user", "customer"].includes(identity))
        throw new Error("demo_identity_invalid");
      if (identity === "user" && !userToken)
        userToken = await login(
          env.SEED_USER_EMAIL ?? "user@example.com",
          env.SEED_USER_PASS ?? "User123!",
        );
      const session = identity === "customer" ? await ensureCustomer() : null;
      return request(
        identity === "anonymous"
          ? storefront
          : identity === "customer"
            ? customer
            : admin,
        operation,
        {
          ...input,
          ...(identity === "anonymous"
            ? {}
            : {
                accessToken:
                  session?.token ?? (identity === "user" ? userToken : token),
              }),
          idempotencyKey: input.idempotencyKey ?? randomUUID(),
        },
      );
    },
    async call(operation, input, identity) {
      return unwrapGatewayResult(
        operation,
        await api.result(operation, input, identity),
      );
    },
    async upload(url, bytes, uploadHeaders) {
      if (
        !uploadHeaders ||
        !/^[a-f0-9]{64}$/u.test(
          uploadHeaders["x-amz-meta-nebula-upload-binding"] ?? "",
        )
      )
        throw new Error("demo_upload_headers_missing");
      const target = new URL(url);
      if (
        !["localhost", "127.0.0.1"].includes(target.hostname) ||
        target.protocol !== "http:"
      )
        throw new Error("demo_upload_requires_local_store");
      const result = await globalThis.fetch(url, {
        method: "PUT",
        headers: uploadHeaders,
        body: bytes,
        signal: globalThis.AbortSignal.timeout(30_000),
      });
      if (![200, 204].includes(result.status))
        throw new Error(`demo_upload_http_${result.status}`);
    },
    async render(id, variant) {
      const result = await api.result(
        "media_render",
        { path: { id }, query: { variant } },
        "anonymous",
      );
      if (!result.ok) throw new Error(`demo_render_http_${result.status}`);
      return Buffer.from(result.data);
    },
    async anonymousWrite(body) {
      // Deliberately bypass the client's token precheck to exercise the server.
      const idempotencyKey = randomUUID();
      const result = await limitRequest(async () => {
        const response = await globalThis.fetch(
          `${baseUrl}/api/v1/admin/products`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "X-Nebula-Client-ID": "admin-web-local",
              Origin: "http://localhost:3000",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(body),
            signal: globalThis.AbortSignal.timeout(30_000),
          },
        );
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch {
          /* Non-JSON failures are not retried. */
        }
        return { status: response.status, headers: response.headers, error };
      });
      return result.status;
    },
    async close() {
      const errors = [];
      for (const session of sessions) {
        try {
          unwrapGatewayResult(
            "logout",
            await request(session.client, "auth_logout", {
              accessToken: session.token,
              cookie: session.cookie,
              ...(session.refreshToken
                ? { body: { refreshToken: session.refreshToken } }
                : {}),
              idempotencyKey: randomUUID(),
            }),
          );
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length)
        throw new AggregateError(errors, "demo_session_cleanup_failed");
    },
  };
  return api;
}
