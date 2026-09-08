import type { ClientGrpc } from "@nestjs/microservices";
import { media } from "@nebula/protos";
import { of } from "rxjs";
import type { GatewayRequestContext } from "../src/application/application.contracts";
import type { GatewayHttpRequest } from "../src/http/public-client-boundary";
import { GatewayMediaApiService } from "../src/media/gateway-media-api.service";

const MEDIA_ID = "8a73870a-ea95-47b7-a289-48ef65855c60";
const USER_ID = "user-1";
const requestContext: GatewayRequestContext = Object.freeze({
  requestId: "request-media-api-123", applicationId: "mobile-local",
  applicationProfile: "mobile", tenantId: "single-site-tenant", siteId: "single-site",
  channelId: "native-mobile", channelKind: "mobile", rateLimitProfile: "default",
});

function gatewayRequest(): GatewayHttpRequest {
  const identity = { userId: USER_ID, role: "user" as const, sessionRef: "session-1" };
  return { headers: {}, rawHeaders: [], requestContext, actor: { kind: "authenticated", identity }, user: identity, accessToken: "user-token" } as GatewayHttpRequest;
}

function record(overrides: Partial<media.Media> = {}) {
  return media.Media.create({
    id: MEDIA_ID, storage: "s3", path: "public/library/file.jpg", filename: "file.jpg",
    mimeType: "image/jpeg", sizeBytes: "10", visibility: "public", accessClass: "PUBLIC",
    status: "READY", scanStatus: "CLEAN", ...overrides,
  });
}

function harness(overrides: Record<string, jest.Mock>) {
  const unused = jest.fn(() => of({}));
  const names = [
    "GetById", "ListPublicLibrary", "ListProtectedLibrary", "ListStrictLibrary",
    "ListMyProtectedLibrary", "PresignPublicLibraryUpload", "PresignProtectedLibraryUpload",
    "PresignStrictLibraryUpload", "FinalizePublicLibraryUpload",
    "FinalizeProtectedLibraryUpload", "FinalizeStrictLibraryUpload",
    "CreatePublicLibraryReadUrl", "CreateProtectedLibraryReadUrl", "CreateStrictLibraryReadUrl",
    "CreateMyProtectedReadUrl", "DeleteProtectedLibraryById", "DeleteStrictLibraryById",
    "PreviewPublicLibraryDelete", "ConfirmPublicLibraryDelete",
  ] as const;
  const raw = Object.fromEntries(names.map((name) => [name, overrides[name] ?? unused]));
  const client = { getService: jest.fn(() => raw) } as unknown as ClientGrpc;
  return { service: new GatewayMediaApiService(client), raw };
}

describe("GatewayMediaApiService", () => {
  const originalKeys = process.env.GATEWAY_OUTBOUND_KEYS;

  beforeEach(() => {
    process.env.GATEWAY_OUTBOUND_KEYS = JSON.stringify({
      "media-service": { id: "gateway-media-v1", secret: "gateway-media-api-test-secret-000000001" },
    });
  });

  afterAll(() => {
    if (originalKeys === undefined) delete process.env.GATEWAY_OUTBOUND_KEYS;
    else process.env.GATEWAY_OUTBOUND_KEYS = originalKeys;
  });

  it("uses the fixed public lane and rejects a widened lane reply", async () => {
    const listPublic = jest.fn(() => of({ items: [record()] }));
    const { service, raw } = harness({ ListPublicLibrary: listPublic });
    await service.list(gatewayRequest(), "public", { q: "file" });
    expect(listPublic.mock.calls[0]?.[0]).toMatchObject({ accessClass: "", visibility: "", ownerId: "" });
    expect(raw.ListProtectedLibrary).not.toHaveBeenCalled();

    const wrong = harness({
      ListPublicLibrary: jest.fn(() => of({ items: [record({ accessClass: "STRICT", visibility: "private" })] })),
    });
    await expect(wrong.service.list(gatewayRequest(), "public", {})).rejects.toMatchObject({ status: 502 });
  });

  it("derives owned-library identity and rejects another owner's row", async () => {
    const listOwned = jest.fn(() => of({
      items: [record({ ownerId: USER_ID, accessClass: "PROTECTED", visibility: "private" })],
    }));
    const { service } = harness({ ListMyProtectedLibrary: listOwned });
    await service.listOwned(gatewayRequest(), { scope: "passport" });
    expect(listOwned.mock.calls[0]?.[0]).not.toHaveProperty("ownerId");

    const wrong = harness({
      ListMyProtectedLibrary: jest.fn(() => of({
        items: [record({ ownerId: "victim", accessClass: "PROTECTED", visibility: "private" })],
      })),
    });
    await expect(wrong.service.listOwned(gatewayRequest(), {})).rejects.toMatchObject({ status: 502 });
  });

  it("keeps access class and visibility out of presign input and validates the result", async () => {
    const presign = jest.fn(() => of({
      storage: "s3", path: "public/library/file.jpg", uploadUrl: "http://storage/upload",
      expiresIn: 300, filename: "file.jpg", mimeType: "image/jpeg", visibility: "public",
      accessClass: "PUBLIC",
    }));
    const { service } = harness({ PresignPublicLibraryUpload: presign });
    await service.presign(gatewayRequest(), "public", { filename: "file.jpg", mimeType: "image/jpeg" });
    expect(presign.mock.calls[0]?.[0]).toMatchObject({ accessClass: "", visibility: "" });
  });
});
