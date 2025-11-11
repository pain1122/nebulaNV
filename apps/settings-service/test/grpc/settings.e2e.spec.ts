// apps/settings-service/test/grpc/settings.e2e.spec.ts
import { loadClient, call, mdS2S } from "./helpers";

const SETTINGS_PROTO = require.resolve("@nebula/protos/settings.proto");
const URL = process.env.SETTINGS_GRPC_URL || "127.0.0.1:50054";

describe("SettingsService gRPC (gateway-only S2S, svc:bucket)", () => {
  // ensure svc name is "bucket" (matches test title & signature payload)
  beforeAll(() => {
    process.env.SVC_NAME = "bucket";
  });

  const client = loadClient<any>({
    url: URL,
    protoPath: SETTINGS_PROTO,
    pkg: ["settings"],
    svc: "SettingsService",
  });

  const ns  = "e2e";
  const env = "default";
  const key = `theme_color_${Math.random().toString(36).slice(2, 8)}`;

  it("SetString then GetString (hit)", async () => {
    const set = await call<any>(
      client,
      "SetString",
      { namespace: ns, environment: env, key, value: "red" },
      mdS2S({ role: "admin" }) // provide a user context
    );
    expect(set).toEqual({ value: "red" });

    const get = await call<any>(
      client,
      "GetString",
      { namespace: ns, environment: env, key },
      mdS2S() // reads don't need admin, but still carry userId
    );
    expect(get).toEqual({ value: "red", found: true });
  });

  it("DeleteString then GetString (miss again)", async () => {
    const del = await call<any>(
      client,
      "DeleteString",
      { namespace: ns, environment: env, key },
      mdS2S({ role: "admin" }) // admin-only
    );
    expect(del).toEqual({ deleted: true });

    const get2 = await call<any>(
      client,
      "GetString",
      { namespace: ns, environment: env, key },
      mdS2S()
    );
    expect(get2).toEqual({ value: "", found: false });
  });

  it("Missing signature → request fails", async () => {
    await expect(
      call<any>(client, "SetString", { namespace: ns, environment: env, key, value: "x" }) // no mdS2S()
    ).rejects.toBeTruthy();
  });
});
