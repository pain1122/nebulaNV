import { httpJson } from "../utils/http";

const SETTINGS_HTTP =
  process.env.SETTINGS_HTTP_URL ?? "http://127.0.0.1:3010";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type GetStringResponse = {
  value: string;
  found: boolean;
};

type SetStringResponse = {
  value: string;
};

type DeleteStringResponse = {
  deleted: boolean;
};

function settingsStringUrl(params: {
  namespace: string;
  key: string;
  environment?: string;
}) {
  const q = new URLSearchParams({
    namespace: params.namespace,
    key: params.key,
    environment: params.environment ?? "default",
  });
  return `${SETTINGS_HTTP}/settings/string?${q.toString()}`;
}

describe("settings-service HTTP (public reads, admin writes)", () => {
  let userAccess = "";
  let adminAccess = "";

  const namespace = "e2e";
  const environment = "default";
  const key = `settings_http_${Math.random().toString(36).slice(2, 10)}`;
  const value = "contract-red";

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

  it("GET /settings/string is public and returns a miss for an unknown key", async () => {
    const res = await httpJson<GetStringResponse>(
      "GET",
      settingsStringUrl({ namespace, environment, key }),
    );

    expect(res).toEqual({ value: "", found: false });
  });

  it("PUT /settings/string denies normal users and allows admins", async () => {
    const body = { namespace, environment, key, value };

    await expect(
      httpJson<SetStringResponse>("PUT", `${SETTINGS_HTTP}/settings/string`, body, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy();

    const res = await httpJson<SetStringResponse>(
      "PUT",
      `${SETTINGS_HTTP}/settings/string`,
      body,
      { authorization: `Bearer ${adminAccess}` },
    );

    expect(res).toEqual({ value });
  });

  it("GET /settings/string returns the value after an admin writes it", async () => {
    const res = await httpJson<GetStringResponse>(
      "GET",
      settingsStringUrl({ namespace, environment, key }),
    );

    expect(res).toEqual({ value, found: true });
  });

  it("DELETE /settings/string denies normal users and allows admins", async () => {
    await expect(
      httpJson<DeleteStringResponse>(
        "DELETE",
        settingsStringUrl({ namespace, environment, key }),
        undefined,
        { authorization: `Bearer ${userAccess}` },
      ),
    ).rejects.toBeTruthy();

    const res = await httpJson<DeleteStringResponse>(
      "DELETE",
      settingsStringUrl({ namespace, environment, key }),
      undefined,
      { authorization: `Bearer ${adminAccess}` },
    );

    expect(res).toEqual({ deleted: true });
  });

  it("GET /settings/string returns a miss after deletion", async () => {
    const res = await httpJson<GetStringResponse>(
      "GET",
      settingsStringUrl({ namespace, environment, key }),
    );

    expect(res).toEqual({ value: "", found: false });
  });
});
