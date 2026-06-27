// apps/media-service/test/http/media.http.e2e.spec.ts
import { httpJson } from "../utils/http";

const MEDIA_HTTP = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResp = { accessToken: string; refreshToken: string };

describe("media-service HTTP (admin-only)", () => {
  let userAccess = "";
  let adminAccess = "";

  beforeAll(async () => {
    const ut = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    });
    userAccess = ut.accessToken;

    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    });
    adminAccess = at.accessToken;
  });

  async function uploadPublicMedia(folderPath: string, displayName: string) {
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      {
        filename: displayName,
        mimeType: "image/webp",
        folderPath,
        displayName,
        visibility: "public",
        scope: "panel",
      },
      { authorization: `Bearer ${adminAccess}` },
    );

    const up = await fetch(presign.data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    });
    expect([200, 204]).toContain(up.status);

    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/finalize`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        folderPath: presign.data.folderPath,
        displayName: presign.data.displayName,
        originalFilename: presign.data.originalFilename,
        filename: presign.data.filename,
        mimeType: presign.data.mimeType,
        visibility: presign.data.visibility,
        scope: presign.data.scope,
      },
      { authorization: `Bearer ${adminAccess}` },
    );

    return created.data;
  }

  it("GET /health reports DB and storage checks", async () => {
    const health = await httpJson<any>("GET", `${MEDIA_HTTP}/health`);

    expect(health.status).toBe("ok");
    expect(health.checks.db.status).toBe("ok");
    expect(["ok", "skipped"]).toContain(health.checks.storage.status);
  });

  it("POST /media/presign requires admin (user denied, admin allowed)", async () => {
    const body = {
      filename: `e2e_${Math.random().toString(36).slice(2, 8)}.webp`,
      mimeType: "image/webp",
      folderPath: "/test/presign",
      displayName: `public_${Math.random().toString(36).slice(2, 8)}.webp`,
      visibility: "public",
      scope: "panel",
    };

    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy();

    const res = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      body,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );

    expect(res?.data?.uploadUrl).toBeTruthy();
    expect(new URL(res.data.uploadUrl).hostname).not.toBe("minio");
    expect(res?.data?.bucket).toBeTruthy();
    expect(res?.data?.path).toBeTruthy();
    expect(res.data.path).toBe(`uploads/test/presign/${body.displayName}`);
    expect(res.data.folderPath).toBe("/test/presign");
    expect(res.data.displayName).toBe(body.displayName);
    expect(res.data.originalFilename).toBe(body.filename);
    expect(res.data.path).not.toContain("pending");
    expect(res.data.path).not.toContain("protected");
    expect(res?.data?.mimeType).toBe("image/webp");
  });

  it("presign -> PUT -> finalize -> GET -> LIST -> read-url -> DELETE (admin)", async () => {
    const folderPath = `/test/e2e_${Math.random().toString(36).slice(2, 8)}`;

    // 1) presign
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      {
        filename: "e2e.webp",
        mimeType: "image/webp",
        folderPath,
        displayName: "hero.webp",
        visibility: "public",
        scope: "panel",
      },
      { authorization: `Bearer ${adminAccess}` },
    );

    const uploadUrl: string = presign.data.uploadUrl;
    expect(new URL(uploadUrl).hostname).not.toBe("minio");
    expect(presign.data.path).toBe(`uploads/${folderPath.slice(1)}/hero.webp`);
    expect(presign.data.folderPath).toBe(folderPath);
    expect(presign.data.displayName).toBe("hero.webp");

    // 2) upload tiny payload
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    });
    expect([200, 204]).toContain(up.status);

    // 3) finalize row from trusted object metadata
    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/finalize`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        folderPath: presign.data.folderPath,
        displayName: presign.data.displayName,
        originalFilename: presign.data.originalFilename,
        filename: presign.data.filename ?? "e2e.webp",
        mimeType: presign.data.mimeType ?? "image/webp",
        visibility: presign.data.visibility ?? "public",
        scope: presign.data.scope ?? "panel",
      },
      { authorization: `Bearer ${adminAccess}` },
    );

    expect(created?.data?.id).toBeTruthy();
    expect(created.data.path).toBe(presign.data.path);
    expect(created.data.folderPath).toBe(folderPath);
    expect(created.data.displayName).toBe("hero.webp");
    const id = created.data.id;

    // user cannot list/get
    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media?take=10&skip=0`, undefined, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy();

    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy();

    // admin can get
    const got = await httpJson<any>(
      "GET",
      `${MEDIA_HTTP}/media/${id}`,
      undefined,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );
    expect(got.data.id).toBe(id);

    // admin can list
    const list = await httpJson<any>(
      "GET",
      `${MEDIA_HTTP}/media?take=10&skip=0`,
      undefined,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );
    expect(Array.isArray(list.data)).toBe(true);

    const folderList = await httpJson<any>(
      "GET",
      `${MEDIA_HTTP}/media?folderPath=${encodeURIComponent(folderPath)}`,
      undefined,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );
    expect(folderList.data.some((item: any) => item.id === id)).toBe(true);

    const readUrl = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/${id}/read-url`,
      undefined,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );
    expect(readUrl.data.url).toBeTruthy();
    expect(readUrl.data.expiresIn).toBeGreaterThan(0);

    // delete
    const del = await httpJson<any>(
      "DELETE",
      `${MEDIA_HTTP}/media/${id}`,
      undefined,
      {
        authorization: `Bearer ${adminAccess}`,
      },
    );
    expect(del).toEqual({ deleted: true });
  });

  it("GET /media/browse returns Supabase-style folders and files", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const baseFolder = `/test/browse_${suffix}`;
    const heroName = `hero_${suffix}.webp`;
    const sideName = `side_${suffix}.webp`;
    const ids: string[] = [];

    try {
      const hero = await uploadPublicMedia(`${baseFolder}/shoes`, heroName);
      const side = await uploadPublicMedia(
        `${baseFolder}/shoes/gallery`,
        sideName,
      );
      ids.push(hero.id, side.id);

      const rootBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/browse?take=200`,
        undefined,
        { authorization: `Bearer ${adminAccess}` },
      );
      expect(rootBrowse.data.folders.some((f: any) => f.name === "test")).toBe(
        true,
      );

      const testBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/browse?path=${encodeURIComponent("test")}&take=200`,
        undefined,
        { authorization: `Bearer ${adminAccess}` },
      );
      expect(
        testBrowse.data.folders.some((f: any) => f.name === `browse_${suffix}`),
      ).toBe(true);

      const baseBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/browse?folderPath=${encodeURIComponent(baseFolder)}&take=200`,
        undefined,
        { authorization: `Bearer ${adminAccess}` },
      );
      expect(baseBrowse.data.folders.some((f: any) => f.name === "shoes")).toBe(
        true,
      );
      expect(Array.isArray(baseBrowse.data.files)).toBe(true);

      const shoesBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/browse?path=${encodeURIComponent(`${baseFolder.slice(1)}/shoes`)}&take=200`,
        undefined,
        { authorization: `Bearer ${adminAccess}` },
      );
      expect(
        shoesBrowse.data.folders.some((f: any) => f.name === "gallery"),
      ).toBe(true);
      expect(
        shoesBrowse.data.files.some(
          (file: any) => file.displayName === heroName,
        ),
      ).toBe(true);

      const searchBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/browse?folderPath=${encodeURIComponent(`${baseFolder}/shoes`)}&search=${encodeURIComponent("hero")}`,
        undefined,
        { authorization: `Bearer ${adminAccess}` },
      );
      expect(
        searchBrowse.data.files.some(
          (file: any) => file.displayName === heroName,
        ),
      ).toBe(true);
      expect(
        searchBrowse.data.files.some(
          (file: any) => file.displayName === sideName,
        ),
      ).toBe(false);
    } finally {
      for (const id of ids) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined);
      }
    }
  });

  it("POST /media/presign rejects protected/strict filemanager uploads", async () => {
    const base = {
      filename: "secret.webp",
      mimeType: "image/webp",
      folderPath: "/test/private",
      displayName: "secret.webp",
      scope: "panel",
    };

    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/presign`,
        { ...base, accessClass: "PROTECTED" },
        { authorization: `Bearer ${adminAccess}` },
      ),
    ).rejects.toBeTruthy();

    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/presign`,
        { ...base, accessClass: "STRICT" },
        { authorization: `Bearer ${adminAccess}` },
      ),
    ).rejects.toBeTruthy();
  });

  it("POST /media/finalize rejects protected/strict public filemanager paths", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/test/private/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        { authorization: `Bearer ${adminAccess}` },
      ),
    ).rejects.toBeTruthy();
  });

  it("POST /media/finalize rejects descriptive protected/strict private paths", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "private/objects/products/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        { authorization: `Bearer ${adminAccess}` },
      ),
    ).rejects.toBeTruthy();
  });
});
