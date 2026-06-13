import { loadClient, call, mdAuth, CODES } from "./helpers";
import { httpJson } from "../utils/http";

const SETTINGS_PROTO = require.resolve("@nebula/protos/settings.proto");
const URL = process.env.SETTINGS_GRPC_URL || "127.0.0.1:50054";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

describe("SettingsService gRPC (public reads, admin writes)", () => {
  let userAccess = "";
  let adminAccess = "";

  const client = loadClient<any>({
    url: URL,
    protoPath: SETTINGS_PROTO,
    pkg: ["settings"],
    svc: "SettingsService",
  });

  const ns = "e2e";
  const env = "default";
  const key = `theme_color_${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    const user = await httpJson<LoginResponse>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    });
    userAccess = user.accessToken;

    const admin = await httpJson<LoginResponse>(
      "POST",
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
        password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
      },
    );
    adminAccess = admin.accessToken;
  });

  it("GetString is public and returns a miss for an unknown key", async () => {
    const get = await call<any>(client, "GetString", {
      namespace: ns,
      environment: env,
      key,
    });

    expect(get).toEqual({ value: "", found: false });
  });

  it("SetString rejects normal users", async () => {
    await expect(
      call<any>(
        client,
        "SetString",
        { namespace: ns, environment: env, key, value: "red" },
        mdAuth({ access: userAccess }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it("SetString then GetString succeeds for admins", async () => {
    const set = await call<any>(
      client,
      "SetString",
      { namespace: ns, environment: env, key, value: "red" },
      mdAuth({ access: adminAccess }),
    );
    expect(set).toEqual({ value: "red" });

    const get = await call<any>(client, "GetString", {
      namespace: ns,
      environment: env,
      key,
    });
    expect(get).toEqual({ value: "red", found: true });
  });

  it("DeleteString rejects normal users", async () => {
    await expect(
      call<any>(
        client,
        "DeleteString",
        { namespace: ns, environment: env, key },
        mdAuth({ access: userAccess }),
      ),
    ).rejects.toMatchObject({ code: CODES.PERMISSION_DENIED });
  });

  it("DeleteString then GetString succeeds for admins", async () => {
    const del = await call<any>(
      client,
      "DeleteString",
      { namespace: ns, environment: env, key },
      mdAuth({ access: adminAccess }),
    );
    expect(del).toEqual({ deleted: true });

    const get = await call<any>(client, "GetString", {
      namespace: ns,
      environment: env,
      key,
    });
    expect(get).toEqual({ value: "", found: false });
  });

  it("SetString rejects requests without S2S metadata", async () => {
    await expect(
      call<any>(client, "SetString", {
        namespace: ns,
        environment: env,
        key,
        value: "x",
      }),
    ).rejects.toMatchObject({ code: CODES.UNAUTHENTICATED });
  });
});
