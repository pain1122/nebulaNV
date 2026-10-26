import type { ClientGrpc } from "@nestjs/microservices";
import { media } from "@nebula/protos";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayMediaApiService } from "../src/media/gateway-media-api.service";

const MEDIA_ID = "8a73870a-ea95-47b7-a289-48ef65855c60";
const USER_ID = "user-1";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-media-api-123",
  applicationId: "mobile-local",
  applicationProfile: "mobile",
  tenantId: "single-site-tenant",
  siteId: "single-site",
  channelId: "native-mobile",
  channelKind: "mobile",
  rateLimitProfile: "default",
});

function gatewayRequest(): GatewayHttpRequest {
  const identity = {
    userId: USER_ID,
    role: "user" as const,
    sessionRef: "session-1",
  };
  return {
    headers: {},
    rawHeaders: [],
    requestContext,
    actor: { kind: "authenticated", identity },
    user: identity,
    accessToken: "user-token",
  } as unknown as GatewayHttpRequest;
}

function record(overrides: Partial<media.Media> = {}) {
  return media.Media.create({
    id: MEDIA_ID,
    storage: "s3",
    path: "public/library/file.jpg",
    filename: "file.jpg",
    mimeType: "image/jpeg",
    sizeBytes: "10",
    visibility: "public",
    accessClass: "PUBLIC",
    status: "READY",
    scanStatus: "CLEAN",
    ...overrides,
  });
}

function harness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn((_request: unknown, _metadata?: unknown) => {
    void _request;
    void _metadata;
    return of({});
  });
  const names = [
    "UpdateMetadata",
    "GetDerivatives",
    "RegenerateDerivatives",
    "GetById",
    "ListPublicLibrary",
    "ListProtectedLibrary",
    "ListStrictLibrary",
    "ListMyProtectedLibrary",
    "PresignPublicLibraryUpload",
    "PresignProtectedLibraryUpload",
    "PresignStrictLibraryUpload",
    "FinalizePublicLibraryUpload",
    "FinalizeProtectedLibraryUpload",
    "FinalizeStrictLibraryUpload",
    "CreatePublicLibraryReadUrl",
    "CreateProtectedLibraryReadUrl",
    "CreateStrictLibraryReadUrl",
    "CreateMyProtectedReadUrl",
    "DeleteProtectedLibraryById",
    "DeleteStrictLibraryById",
    "PreviewPublicLibraryDelete",
    "ConfirmPublicLibraryDelete",
    "ResolveProductReference",
  ] as const;
  const raw = Object.fromEntries(
    names.map((name) => [name, overrides[name] ?? unused]),
  );
  const client = {
    getService: jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return raw;
    }),
  } as unknown as ClientGrpc;
  return { service: new GatewayMediaApiService(client), raw };
}

describe("GatewayMediaApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "media-service": {
        id: "gateway-media-v1",
        secret: "gateway-media-api-test-secret-000000001",
      },
    });
  });

  it("returns only approved size facts and constructs its own Gateway render path", async () => {
    const generationId = "018f6b70-19a2-4b90-a8ab-123456789abc";
    const result = {
      mediaId: MEDIA_ID,
      desiredGenerationId: generationId,
      approvedGenerationId: generationId,
      status: "COMPLETED",
      lastError: "",
      attempts: 1,
      outputs: [
        {
          view: "card",
          generationId,
          recipeHash: "a".repeat(64),
          sha256: "b".repeat(64),
          mimeType: "image/png",
          width: 20,
          height: 10,
          sizeBytes: 100,
          renderPath: "http://private-storage/secret",
          bucket: "secret",
          path: "private/secret",
        },
      ],
    };
    const get = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of(result);
    });
    const h = harness({ GetDerivatives: get });
    const response = await h.service.getDerivatives(gatewayRequest(), MEDIA_ID);
    expect(response.outputs[0].renderPath).toBe(
      `/api/v1/media/render/${MEDIA_ID}?variant=card`,
    );
    expect(response.outputs[0]).not.toHaveProperty("bucket");
    expect(response.outputs[0]).not.toHaveProperty("path");
    result.outputs[0].generationId = MEDIA_ID;
    await expect(
      h.service.getDerivatives(gatewayRequest(), MEDIA_ID),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("passes recipes only inside the signed owning-service request", async () => {
    const regenerate = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        mediaId: MEDIA_ID,
        status: "QUEUED",
        desiredGenerationId: MEDIA_ID,
        approvedGenerationId: "",
        lastError: "",
        attempts: 0,
        outputs: [],
      });
    });
    const h = harness({ RegenerateDerivatives: regenerate });
    const recipes = [
      { view: "card" as const, width: 20, height: 10, fit: "cover" as const },
    ];
    await h.service.regenerateDerivatives(gatewayRequest(), MEDIA_ID, {
      recipes,
    });
    expect(regenerate.mock.calls[0]?.[0]).toMatchObject({
      id: MEDIA_ID,
      recipesJson: JSON.stringify(recipes),
      retryFailed: false,
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("uses the fixed public lane and rejects a widened lane reply", async () => {
    const listPublic = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({ items: [record()] });
    });
    const { service, raw } = harness({ ListPublicLibrary: listPublic });
    await service.list(gatewayRequest(), "public", { q: "file" });
    expect(listPublic.mock.calls[0]?.[0]).toMatchObject({
      accessClass: "",
      visibility: "",
      ownerId: "",
    });
    expect(raw.ListProtectedLibrary).not.toHaveBeenCalled();

    const wrong = harness({
      ListPublicLibrary: jest.fn((_request: unknown, _metadata?: unknown) => {
        void _request;
        void _metadata;
        return of({
          items: [record({ accessClass: "STRICT", visibility: "private" })],
        });
      }),
    });
    await expect(
      wrong.service.list(gatewayRequest(), "public", {}),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("derives owned-library identity and rejects another owner's row", async () => {
    const listOwned = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        items: [
          record({
            ownerId: USER_ID,
            accessClass: "PROTECTED",
            visibility: "private",
          }),
        ],
      });
    });
    const { service } = harness({ ListMyProtectedLibrary: listOwned });
    await service.listOwned(gatewayRequest(), { scope: "passport" });
    expect(listOwned.mock.calls[0]?.[0]).not.toHaveProperty("ownerId");

    const wrong = harness({
      ListMyProtectedLibrary: jest.fn(
        (_request: unknown, _metadata?: unknown) => {
          void _request;
          void _metadata;
          return of({
            items: [
              record({
                ownerId: "victim",
                accessClass: "PROTECTED",
                visibility: "private",
              }),
            ],
          });
        },
      ),
    });
    await expect(
      wrong.service.listOwned(gatewayRequest(), {}),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("keeps access class and visibility out of presign input and validates the result", async () => {
    const presign = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        storage: "s3",
        path: "public/library/file.jpg",
        uploadUrl: "http://storage/upload",
        expiresIn: 300,
        filename: "file.jpg",
        mimeType: "image/jpeg",
        visibility: "public",
        accessClass: "PUBLIC",
      });
    });
    const { service } = harness({ PresignPublicLibraryUpload: presign });
    await service.presign(gatewayRequest(), "public", {
      filename: "file.jpg",
      mimeType: "image/jpeg",
    });
    expect(presign.mock.calls[0]?.[0]).toMatchObject({
      accessClass: "",
      visibility: "",
    });
  });

  it("uses the Media default scope for public delete preview and confirm", async () => {
    const preview = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        scope: "panel",
        recursive: false,
        canDelete: true,
        warnings: [],
        fileCount: 1,
        folderCount: 1,
        totalSizeBytes: "10",
        folders: [],
        files: [],
        confirmToken: "token",
        expiresIn: 30,
      });
    });
    const confirm = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        deleted: true,
        fileCount: 1,
        folderCount: 1,
        totalSizeBytes: "10",
      });
    });
    const { service } = harness({
      PreviewPublicLibraryDelete: preview,
      ConfirmPublicLibraryDelete: confirm,
    });
    const items = [{ type: "file" as const, id: MEDIA_ID }];

    await service.previewPublicDelete(gatewayRequest(), { items });
    await service.confirmPublicDelete(gatewayRequest(), {
      items,
      confirmToken: "token",
    });
    expect(preview.mock.calls[0]?.[0]).toMatchObject({ scope: "panel" });
    expect(confirm.mock.calls[0]?.[0]).toMatchObject({ scope: "panel" });
  });

  it("encodes JSON null as reset and empty alt as an explicit signed value", async () => {
    const update = jest.fn((_request: unknown, _metadata?: unknown) => {
      void _request;
      void _metadata;
      return of({
        media: record({ title: undefined, defaultAlt: "", metadataVersion: 2 }),
      });
    });
    const { service } = harness({ UpdateMetadata: update });
    const result = await service.updateMetadata(gatewayRequest(), MEDIA_ID, {
      expectedVersion: 1,
      title: null,
      defaultAlt: "",
    });
    expect(update.mock.calls[0]?.[0]).toEqual({
      id: MEDIA_ID,
      expectedVersion: 1,
      clearTitle: true,
      clearDefaultAlt: false,
      defaultAlt: "",
    });
    expect(result).toMatchObject({
      title: null,
      defaultAlt: "",
      metadataVersion: 2,
    });
  });
});
