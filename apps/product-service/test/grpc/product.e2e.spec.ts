// apps/product-service/test/grpc/product.e2e.spec.ts
import { status } from "@grpc/grpc-js";
import { loadClient, call, mdS2S, setS2STestActorToken } from "./helpers";
import { getDefaultProductCategoryGrpc } from "../utils/settings";
import { httpJson } from "../utils/http";
import { randomUUID } from "node:crypto";

const PRODUCT_PROTO = require.resolve("@nebula/protos/product.proto");
const URL = process.env.PRODUCT_GRPC_URL || "127.0.0.1:50053";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";
const MEDIA_HTTP = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007";
const MISSING_ID = "11111111-1111-4111-8111-111111111111";
// Valid 8x6 PNG; the fixture goes through the normal scanner/approval pipeline.
const GALLERY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWNQSluFFTEMpAQAtyY5YUeDlrAAAAAASUVORK5CYII=",
  "base64",
);

type LoginResp = { accessToken: string };
type GalleryMediaPresign = {
  uploadUrl: string;
  storage: string;
  bucket: string;
  path: string;
  filename: string;
  mimeType: string;
  folderPath: string;
  displayName: string;
  originalFilename: string;
  scope: string;
};
type GalleryMediaState = {
  id: string;
  status: string;
  scanStatus: string;
  scanError?: string;
};

describe("ProductService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ["product"],
    svc: "ProductService",
  });

  let id = "";
  let draftId = "";
  let categoryId = "";
  let userAccess = "";
  let sku = "";
  let version = 1;
  let adminAccess = "";
  let galleryMediaId = "";

  async function uploadGalleryMedia() {
    const headers = { authorization: `Bearer ${adminAccess}` };
    const filename = `product-gallery-${randomUUID()}.png`;
    const { data: presign } = await httpJson<{ data: GalleryMediaPresign }>(
      "POST",
      `${MEDIA_HTTP}/media/public-library/presign`,
      {
        filename,
        mimeType: "image/png",
        folderPath: "/product-grpc-proof",
        displayName: filename,
        scope: "panel",
      },
      headers,
    );
    const uploaded = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: GALLERY_PNG,
      signal: AbortSignal.timeout(20_000),
    });
    expect([200, 204]).toContain(uploaded.status);
    const { data: media } = await httpJson<{ data: GalleryMediaState }>(
      "POST",
      `${MEDIA_HTTP}/media/public-library/finalize`,
      {
        storage: presign.storage,
        bucket: presign.bucket,
        path: presign.path,
        filename: presign.filename,
        mimeType: presign.mimeType,
        folderPath: presign.folderPath,
        displayName: presign.displayName,
        originalFilename: presign.originalFilename,
        scope: presign.scope,
      },
      headers,
    );
    galleryMediaId = media.id;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const { data } = await httpJson<{ data: GalleryMediaState }>(
        "GET",
        `${MEDIA_HTTP}/media/${galleryMediaId}`,
        undefined,
        headers,
      );
      if (data.status === "READY" && data.scanStatus === "CLEAN") return;
      if (data.status === "BLOCKED")
        throw new Error(`gallery_fixture_blocked_${data.scanError}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("gallery_fixture_approval_timeout");
  }

  afterAll(async () => {
    try {
      if (draftId) {
        const gallery = await call<{ images: Array<{ id: string }> }>(
          client,
          "AdminListGallery",
          { productId: draftId, includeDeleted: true },
          mdS2S({ role: "admin" }),
        );
        for (const image of gallery.images) {
          await call(
            client,
            "RemoveImage",
            { productId: draftId, imageId: image.id, hardDelete: true },
            mdS2S({ role: "admin" }),
          );
        }
        await call(client, "HardDeleteProduct", { id: draftId }, mdS2S());
      }
      if (galleryMediaId) {
        await httpJson(
          "DELETE",
          `${MEDIA_HTTP}/media/public-library/${galleryMediaId}`,
          undefined,
          { authorization: `Bearer ${adminAccess}` },
        );
      }
    } finally {
      client.close();
    }
  }, 30_000);

  beforeAll(async () => {
    // (Optional) login admin – not strictly needed for S2S, but handy to ensure auth-service is alive
    const login = await fetch(`${AUTH_HTTP}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
        password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
      }),
    }).then((r) => r.json() as Promise<LoginResp>);
    adminAccess = login.accessToken;
    setS2STestActorToken(adminAccess);

    const userLogin = await fetch(`${AUTH_HTTP}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
        password: process.env.SEED_USER_PASS ?? "User123!",
      }),
    }).then((r) => r.json() as Promise<LoginResp>);
    userAccess = userLogin.accessToken;

    // Read the default product category from settings via gRPC
    categoryId = await getDefaultProductCategoryGrpc();
  });

  it("CreateProduct succeeds with S2S admin metadata", async () => {
    const input = {
      title: "E2E Widget gRPC",
      price: 149.5,
      categoryId,
      status: "ACTIVE",
    };

    const res = await call<any>(
      client,
      "CreateProduct",
      { data: input },
      mdS2S({ role: "admin" }),
    );

    id = res.data.id;
    sku = res.data.sku;
    version = res.data.version;
    expect(res.data.title).toBe(input.title);
    expect(res.data.categoryId).toBe(categoryId);
    expect(res.data).toMatchObject({
      price: 149.5,
      currency: "USD",
      discountType: "NONE",
      discountValue: 0,
      discountActive: false,
      effectivePrice: 149.5,
      trackInventory: false,
      stockQuantity: 0,
      availability: "AVAILABLE",
      version: 1,
    });
  });

  it("returns ALREADY_EXISTS for an explicit duplicate SKU", async () => {
    await expect(
      call<any>(
        client,
        "CreateProduct",
        {
          data: {
            title: "Explicit SKU conflict",
            slug: `unique-grpc-sku-conflict-${Date.now()}`,
            sku,
            price: 10,
            categoryId,
          },
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.ALREADY_EXISTS,
      details: "product_sku_conflict",
    });
  });

  it("rejects a Product currency outside the configured shop currency", async () => {
    await expect(
      call<any>(
        client,
        "CreateProduct",
        {
          data: {
            title: "Wrong Currency gRPC Widget",
            price: 10,
            categoryId,
            currency: "EUR",
          },
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.INVALID_ARGUMENT,
      details: "product_currency_mismatch",
    });
  });

  it("GetProduct returns the created item (public)", async () => {
    const res = await call<any>(client, "GetProduct", { id }, mdS2S());
    expect(res.data.id).toBe(id);
    expect(res.data.categoryId).toBe(categoryId);
  });

  it("ListProducts finds the created item (public)", async () => {
    const res = await call<any>(
      client,
      "ListProducts",
      { q: "gRPC", page: 1, limit: 20 },
      mdS2S(),
    );
    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });

  it("keeps DRAFT products on the distinct admin read contracts", async () => {
    const title = `E2E Hidden Draft ${Date.now()}`;
    const created = await call<any>(
      client,
      "CreateProduct",
      { data: { title, price: 20, categoryId, status: "DRAFT" } },
      mdS2S({ role: "admin" }),
    );
    draftId = created.data.id;

    await expect(
      call(client, "GetProduct", { id: draftId }, mdS2S()),
    ).rejects.toMatchObject({ code: status.NOT_FOUND });

    const publicList = await call<any>(
      client,
      "ListProducts",
      { q: title, status: "DRAFT", includeDeleted: true },
      mdS2S(),
    );
    expect(publicList.data).toEqual([]);

    const adminGet = await call<any>(
      client,
      "AdminGetProduct",
      { id: draftId },
      mdS2S({ role: "admin" }),
    );
    expect(adminGet.data).toMatchObject({ id: draftId, status: "DRAFT" });

    const adminList = await call<any>(
      client,
      "AdminListProducts",
      { q: title, status: "DRAFT", includeDeleted: true },
      mdS2S({ role: "admin" }),
    );
    expect(adminList.data.some((product: any) => product.id === draftId)).toBe(
      true,
    );
  });

  it("rejects a normal user from Product admin reads", async () => {
    await expect(
      call(
        client,
        "AdminGetProduct",
        { id },
        mdS2S({ accessToken: userAccess, role: "user" }),
      ),
    ).rejects.toMatchObject({ code: status.PERMISSION_DENIED });
  });

  it("separates public and admin gallery visibility", async () => {
    await expect(
      call(
        client,
        "AddImages",
        {
          productId: draftId,
          images: [{ url: "https://example.test/draft.jpg", alt: "draft" }],
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.INVALID_ARGUMENT,
      details: "gallery_media_id_required",
    });
    await uploadGalleryMedia();
    const added = await call<any>(
      client,
      "AddImages",
      {
        productId: draftId,
        images: [
          { mediaId: galleryMediaId, alt: "draft" },
          { mediaId: galleryMediaId, alt: "draft 2" },
        ],
      },
      mdS2S({ role: "admin" }),
    );
    expect(added.images).toEqual([
      expect.objectContaining({
        mediaId: galleryMediaId,
        url: `/api/v1/media/render/${galleryMediaId}`,
        alt: "draft",
        sort: 0,
      }),
      expect.objectContaining({
        mediaId: galleryMediaId,
        url: `/api/v1/media/render/${galleryMediaId}`,
        alt: "draft 2",
        sort: 1,
      }),
    ]);

    await expect(
      call(client, "ListGallery", { productId: draftId }, mdS2S()),
    ).rejects.toMatchObject({ code: status.NOT_FOUND });

    const adminGallery = await call<any>(
      client,
      "AdminListGallery",
      { productId: draftId, includeDeleted: true },
      mdS2S({ role: "admin" }),
    );
    expect(adminGallery.images).toEqual([
      expect.objectContaining({
        id: added.images[0].id,
        sort: 0,
        deletedAt: "",
      }),
      expect.objectContaining({
        id: added.images[1].id,
        sort: 1,
        deletedAt: "",
      }),
    ]);
  }, 90_000);

  it("returns NOT_FOUND when an admin gallery read names a missing Product", async () => {
    await expect(
      call(
        client,
        "AdminListGallery",
        { productId: MISSING_ID, includeDeleted: true },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.NOT_FOUND,
      details: "product_not_found",
    });
  });

  it("blocks hard delete while a Product has dependent gallery rows", async () => {
    await expect(
      call(
        client,
        "HardDeleteProduct",
        { id: draftId },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.ALREADY_EXISTS,
      details: "product_has_dependents",
    });
  });

  it("UpdateProduct (admin) changes title and calculates its discount", async () => {
    const res = await call<any>(
      client,
      "UpdateProduct",
      {
        id,
        data: {
          title: "E2E Widget gRPC Pro",
          discountType: "PERCENTAGE",
          discountValue: 10,
          discountActive: true,
        },
        expectedVersion: version,
      },
      mdS2S({ role: "admin" }),
    );
    expect(res.data.title).toBe("E2E Widget gRPC Pro");
    expect(res.data).toMatchObject({
      discountType: "PERCENTAGE",
      discountValue: 10,
      discountActive: true,
      effectivePrice: 134.55,
      version: version + 1,
    });
    const staleVersion = version;
    version = res.data.version;

    await expect(
      call<any>(
        client,
        "UpdateProduct",
        {
          id,
          data: { title: "Stale overwrite" },
          expectedVersion: staleVersion,
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.ALREADY_EXISTS,
      details: "product_version_conflict",
    });
  });

  it("UpdateProduct returns NOT_FOUND for a missing product", async () => {
    await expect(
      call<any>(
        client,
        "UpdateProduct",
        {
          id: MISSING_ID,
          data: { title: "Missing product" },
          expectedVersion: 1,
        },
        mdS2S({ role: "admin" }),
      ),
    ).rejects.toMatchObject({
      code: status.NOT_FOUND,
      details: "product_not_found",
    });
  });

  it("hides a soft-deleted product from public reads but not admin reads", async () => {
    await call(client, "DeleteProduct", { id }, mdS2S({ role: "admin" }));

    await expect(
      call(client, "GetProduct", { id }, mdS2S()),
    ).rejects.toMatchObject({ code: status.NOT_FOUND });

    const adminGet = await call<any>(
      client,
      "AdminGetProduct",
      { id },
      mdS2S({ role: "admin" }),
    );
    expect(adminGet.data.id).toBe(id);
    expect(adminGet.data.deletedAt).not.toBe("");
  });

  it("restores a soft-deleted Product", async () => {
    const restored = await call<any>(
      client,
      "RestoreProduct",
      { id },
      mdS2S({ role: "admin" }),
    );
    expect(restored.data).toMatchObject({ id, deletedAt: "" });

    await expect(
      call<any>(client, "GetProduct", { id }, mdS2S()),
    ).resolves.toMatchObject({ data: { id } });
  });

  it("hard-deletes a dependency-free Product", async () => {
    const removed = await call<any>(
      client,
      "HardDeleteProduct",
      { id },
      mdS2S({ role: "admin" }),
    );
    expect(removed.data.id).toBe(id);

    await expect(
      call(client, "AdminGetProduct", { id }, mdS2S({ role: "admin" })),
    ).rejects.toMatchObject({
      code: status.NOT_FOUND,
      details: "product_not_found",
    });
  });
});
