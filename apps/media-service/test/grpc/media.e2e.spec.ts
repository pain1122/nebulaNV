// apps/media-service/test/grpc/media.e2e.spec.ts
import { loadClient, call, mdS2S } from "./helpers";

const MEDIA_PROTO = require.resolve("@nebula/protos/media.proto");
const MEDIA_GRPC_URL = process.env.MEDIA_GRPC_URL || "127.0.0.1:50058";

describe("MediaService gRPC (gateway-only S2S, svc:bucket)", () => {
  beforeAll(() => {
    process.env.SVC_NAME = "bucket";
  });

  const client = loadClient<any>({
    url: MEDIA_GRPC_URL,
    protoPath: MEDIA_PROTO,
    pkg: ["media"],
    svc: "MediaService",
  });

  async function putTinyObject(uploadUrl: string, body = "hello") {
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from(body),
    });

    expect([200, 204]).toContain(up.status);
  }

  function finalizeFromPresign(presign: any) {
    return {
      storage: "s3",
      bucket: presign.bucket,
      path: presign.path,
      folderPath: presign.folderPath,
      displayName: presign.displayName,
      originalFilename: presign.originalFilename,
      filename: presign.filename,
      mimeType: presign.mimeType,
      visibility: presign.visibility,
      accessClass: presign.accessClass,
      scope: presign.scope,
      ownerId: presign.ownerId,
      entityType: presign.entityType,
      entityId: presign.entityId,
    };
  }

  it("PresignUpload -> PUT -> FinalizeUpload -> GetById -> List -> DeleteById", async () => {
    const folderPath = `/test/grpc_${Math.random().toString(36).slice(2, 8)}`;

    const presign = await call<any>(
      client,
      "PresignUpload",
      {
        filename: "e2e.webp",
        mimeType: "image/webp",
        folderPath,
        displayName: "hero.webp",
        scope: "panel",
      },
      mdS2S({ role: "admin" }),
    );

    expect(presign.uploadUrl).toBeTruthy();
    expect(new URL(presign.uploadUrl).hostname).not.toBe("minio");
    expect(presign.bucket).toBeTruthy();
    expect(presign.path).toBeTruthy();
    expect(presign.path).toBe(`uploads/${folderPath.slice(1)}/hero.webp`);
    expect(presign.folderPath).toBe(folderPath);
    expect(presign.displayName).toBe("hero.webp");
    expect(presign.originalFilename).toBe("e2e.webp");
    expect(presign.path).not.toContain("pending");
    expect(presign.path).not.toContain("protected");

    const up = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    });
    expect([200, 204]).toContain(up.status);

    const created = await call<any>(
      client,
      "FinalizeUpload",
      {
        storage: "s3",
        bucket: presign.bucket,
        path: presign.path,
        folderPath: presign.folderPath,
        displayName: presign.displayName,
        originalFilename: presign.originalFilename,

        filename: presign.filename || "e2e.webp",
        mimeType: presign.mimeType || "image/webp",
        visibility: presign.visibility || "public",
        scope: presign.scope || "panel",
      },
      mdS2S({ role: "admin" }),
    );

    expect(created.media?.id).toBeTruthy();
    expect(created.media?.path).toBe(presign.path);
    expect(created.media?.folderPath).toBe(folderPath);
    expect(created.media?.displayName).toBe("hero.webp");
    const id = created.media.id;

    const got = await call<any>(
      client,
      "GetById",
      { id },
      mdS2S({ role: "admin" }),
    );
    expect(got.media?.id).toBe(id);

    const list = await call<any>(
      client,
      "List",
      { q: "", take: 50, skip: 0, folderPath },
      mdS2S({ role: "admin" }),
    );
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.some((item: any) => item.id === id)).toBe(true);

    const lifecycleList = await call<any>(
      client,
      "List",
      {
        q: "",
        take: 50,
        skip: 0,
        folderPath,
        status: "PENDING",
        scanStatus: "QUEUED",
      },
      mdS2S({ role: "admin" }),
    );
    expect(lifecycleList.items.some((item: any) => item.id === id)).toBe(true);

    const del = await call<any>(
      client,
      "DeleteById",
      { id },
      mdS2S({ role: "admin" }),
    );
    expect(del).toEqual({ deleted: true });
  });

  it("Create rejects direct S3 row creation", async () => {
    await expect(
      call<any>(
        client,
        "Create",
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/test/direct/direct.webp",
          folderPath: "/test/direct",
          displayName: "direct.webp",
          filename: "direct.webp",
          mimeType: "image/webp",
          sizeBytes: "5",
          visibility: "public",
          scope: "panel",
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();
  });

  it("PresignUpload rejects protected/strict filemanager uploads", async () => {
    const base = {
      filename: "secret.webp",
      mimeType: "image/webp",
      folderPath: "/test/private",
      displayName: "secret.webp",
      scope: "panel",
    };

    await expect(
      call<any>(
        client,
        "PresignUpload",
        { ...base, accessClass: "PROTECTED" },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();

    await expect(
      call<any>(
        client,
        "PresignUpload",
        { ...base, accessClass: "STRICT" },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();
  });

  it("lane-specific gRPC presign supports public/protected/strict contracts", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);

    const publicPresign = await call<any>(
      client,
      "PresignPublicLibraryUpload",
      {
        filename: "hero.webp",
        mimeType: "image/webp",
        folderPath: `/test/grpc_public_${suffix}`,
        displayName: "hero.webp",
        scope: "panel",
      },
      mdS2S({ role: "admin" }),
    );
    expect(publicPresign.accessClass).toBe("PUBLIC");
    expect(publicPresign.visibility).toBe("public");
    expect(publicPresign.path).toBe(
      `uploads/test/grpc_public_${suffix}/hero.webp`,
    );

    await expect(
      call<any>(
        client,
        "PresignProtectedLibraryUpload",
        {
          filename: "secret.webp",
          mimeType: "image/webp",
          scope: "product",
          entityType: "product",
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();

    const protectedPresign = await call<any>(
      client,
      "PresignProtectedLibraryUpload",
      {
        filename: "manual.webp",
        mimeType: "image/webp",
        displayName: "manual.webp",
        scope: "product",
        entityType: "product",
        entityId: `prod_${suffix}`,
      },
      mdS2S({ role: "admin" }),
    );
    expect(protectedPresign.accessClass).toBe("PROTECTED");
    expect(protectedPresign.visibility).toBe("private");
    expect(protectedPresign.scope).toBe("product");
    expect(protectedPresign.entityType).toBe("product");
    expect(protectedPresign.entityId).toBe(`prod_${suffix}`);
    expect(protectedPresign.path).toMatch(/^private\/objects\/[0-9a-f-]+$/);
    expect(protectedPresign.displayName).toBe("manual.webp");

    const strictPresign = await call<any>(
      client,
      "PresignStrictLibraryUpload",
      {
        filename: "passport_salar.webp",
        mimeType: "image/webp",
        displayName: "passport_salar.webp",
        scope: "kyc",
        entityType: "user",
        entityId: `user_${suffix}`,
      },
      mdS2S({ role: "admin" }),
    );
    expect(strictPresign.accessClass).toBe("STRICT");
    expect(strictPresign.visibility).toBe("private");
    expect(strictPresign.path).toMatch(/^private\/objects\/[0-9a-f-]+$/);
    expect(strictPresign.originalFilename).toBe("");
    expect(strictPresign.filename).not.toContain("passport");
    expect(strictPresign.displayName).not.toContain("passport");
  });

  it("protected gRPC lane finalizes, lists by owner/entity context, blocks pending read-url, and deletes by lane", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const ownerId = "00000000-0000-0000-0000-000000000101";
    let id: string | undefined;

    try {
      const presign = await call<any>(
        client,
        "PresignProtectedLibraryUpload",
        {
          filename: "manual.webp",
          mimeType: "image/webp",
          displayName: "manual.webp",
          ownerId,
          scope: "product-media",
          entityType: "product",
          entityId: `prod_${suffix}`,
        },
        mdS2S({ role: "admin" }),
      );

      await putTinyObject(presign.uploadUrl);

      const created = await call<any>(
        client,
        "FinalizeProtectedLibraryUpload",
        finalizeFromPresign(presign),
        mdS2S({ role: "admin" }),
      );

      id = created.media.id;
      expect(id).toBeTruthy();
      expect(created.media.accessClass).toBe("PROTECTED");
      expect(created.media.visibility).toBe("private");
      expect(created.media.ownerId).toBe(ownerId);
      expect(created.media.scope).toBe("product-media");
      expect(created.media.entityType).toBe("product");
      expect(created.media.entityId).toBe(`prod_${suffix}`);
      expect(created.media.status).toBe("PENDING");
      expect(created.media.scanStatus).toBe("QUEUED");

      await expect(
        call<any>(
          client,
          "ListProtectedLibrary",
          {
            ownerId,
            scope: "product-media",
            entityType: "product",
            take: 20,
          },
          mdS2S({ role: "admin" }),
        ),
      ).rejects.toBeTruthy();

      const list = await call<any>(
        client,
        "ListProtectedLibrary",
        {
          ownerId,
          scope: "product-media",
          entityType: "product",
          entityId: `prod_${suffix}`,
          take: 20,
        },
        mdS2S({ role: "admin" }),
      );

      expect(list.items.some((item: any) => item.id === id)).toBe(true);

      const wrongEntityList = await call<any>(
        client,
        "ListProtectedLibrary",
        {
          ownerId,
          scope: "product-media",
          entityType: "product",
          entityId: `prod_other_${suffix}`,
          take: 20,
        },
        mdS2S({ role: "admin" }),
      );

      expect(wrongEntityList.items.some((item: any) => item.id === id)).toBe(
        false,
      );

      await expect(
        call<any>(
          client,
          "CreateProtectedLibraryReadUrl",
          { id },
          mdS2S({ role: "admin" }),
        ),
      ).rejects.toBeTruthy();

      await expect(
        call<any>(
          client,
          "DeletePublicLibraryById",
          { id },
          mdS2S({ role: "admin" }),
        ),
      ).rejects.toBeTruthy();

      const deleted = await call<any>(
        client,
        "DeleteProtectedLibraryById",
        { id },
        mdS2S({ role: "admin" }),
      );
      expect(deleted).toEqual({ deleted: true });
      id = undefined;
    } finally {
      if (id) {
        await call<any>(
          client,
          "DeleteById",
          { id },
          mdS2S({ role: "admin" }),
        ).catch(() => undefined);
      }
    }
  });

  it("strict gRPC lane finalizes, lists by owner/entity context, blocks pending read-url, and deletes by lane", async () => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const ownerId = "00000000-0000-0000-0000-000000000102";
    let id: string | undefined;

    try {
      const presign = await call<any>(
        client,
        "PresignStrictLibraryUpload",
        {
          filename: "passport_salar.webp",
          mimeType: "image/webp",
          displayName: "passport_salar.webp",
          ownerId,
          scope: "identity-docs",
          entityType: "user",
          entityId: `user_${suffix}`,
        },
        mdS2S({ role: "admin" }),
      );

      await putTinyObject(presign.uploadUrl);

      const created = await call<any>(
        client,
        "FinalizeStrictLibraryUpload",
        finalizeFromPresign(presign),
        mdS2S({ role: "admin" }),
      );

      id = created.media.id;
      expect(id).toBeTruthy();
      expect(created.media.accessClass).toBe("STRICT");
      expect(created.media.visibility).toBe("private");
      expect(created.media.ownerId).toBe(ownerId);
      expect(created.media.scope).toBe("identity-docs");
      expect(created.media.entityType).toBe("user");
      expect(created.media.entityId).toBe(`user_${suffix}`);
      expect(created.media.path).toMatch(/^private\/objects\/[0-9a-f-]+$/);
      expect(created.media.originalFilename).toBe("");
      expect(created.media.filename).not.toContain("passport");
      expect(created.media.displayName).not.toContain("passport");
      expect(created.media.status).toBe("PENDING");
      expect(created.media.scanStatus).toBe("QUEUED");

      const list = await call<any>(
        client,
        "ListStrictLibrary",
        {
          ownerId,
          scope: "identity-docs",
          entityType: "user",
          entityId: `user_${suffix}`,
          take: 20,
        },
        mdS2S({ role: "admin" }),
      );

      expect(list.items.some((item: any) => item.id === id)).toBe(true);

      const wrongOwnerList = await call<any>(
        client,
        "ListStrictLibrary",
        {
          ownerId: "00000000-0000-0000-0000-000000000999",
          scope: "identity-docs",
          entityType: "user",
          entityId: `user_${suffix}`,
          take: 20,
        },
        mdS2S({ role: "admin" }),
      );

      expect(wrongOwnerList.items.some((item: any) => item.id === id)).toBe(
        false,
      );

      await expect(
        call<any>(
          client,
          "CreateStrictLibraryReadUrl",
          { id },
          mdS2S({ role: "admin" }),
        ),
      ).rejects.toBeTruthy();

      await expect(
        call<any>(
          client,
          "DeleteProtectedLibraryById",
          { id },
          mdS2S({ role: "admin" }),
        ),
      ).rejects.toBeTruthy();

      const deleted = await call<any>(
        client,
        "DeleteStrictLibraryById",
        { id },
        mdS2S({ role: "admin" }),
      );
      expect(deleted).toEqual({ deleted: true });
      id = undefined;
    } finally {
      if (id) {
        await call<any>(
          client,
          "DeleteById",
          { id },
          mdS2S({ role: "admin" }),
        ).catch(() => undefined);
      }
    }
  });

  it("FinalizeUpload rejects protected/strict public filemanager paths", async () => {
    await expect(
      call<any>(
        client,
        "FinalizeUpload",
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/test/private/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();
  });

  it("FinalizeUpload rejects descriptive protected/strict private paths", async () => {
    await expect(
      call<any>(
        client,
        "FinalizeUpload",
        {
          storage: "s3",
          bucket: "media",
          path: "private/objects/products/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toBeTruthy();
  });

  it("Missing signature → request fails", async () => {
    await expect(
      call<any>(client, "PresignUpload", {
        filename: "x.webp",
        mimeType: "image/webp",
      }), // no mdS2S()
    ).rejects.toBeTruthy();
  });
});
