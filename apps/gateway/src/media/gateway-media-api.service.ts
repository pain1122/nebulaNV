import { BadGatewayException, Inject, Injectable } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { getMedia, type MediaProxy } from "@nebula/clients";
import { media } from "@nebula/protos";
import { MEDIA_SERVICE, MEDIA_SERVICE_TARGET, wrapGrpc } from "@nebula/grpc-auth";
import { firstValueFrom, type Observable } from "rxjs";
import { createGatewayDownstreamContext } from "../downstream/gateway-downstream-context";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import type {
  GatewayMediaAccessClass,
  GatewayMediaAdminListQueryDto,
  GatewayMediaDeleteConfirmDto,
  GatewayMediaDeleteConfirmResultDto,
  GatewayMediaDeletePreviewDto,
  GatewayMediaDeletePreviewResultDto,
  GatewayMediaDeleteResultDto,
  GatewayMediaDto,
  GatewayMediaFinalizeDto,
  GatewayMediaLane,
  GatewayMediaListQueryDto,
  GatewayMediaOwnedReadUrlQueryDto,
  GatewayMediaPresignDto,
  GatewayMediaPresignResultDto,
  GatewayMediaReadUrlResultDto,
} from "./media-api.dto";

const LANE_POLICY = Object.freeze({
  public: Object.freeze({ accessClass: "PUBLIC" as const, visibility: "public" as const }),
  protected: Object.freeze({ accessClass: "PROTECTED" as const, visibility: "private" as const }),
  strict: Object.freeze({ accessClass: "STRICT" as const, visibility: "private" as const }),
});

function actorUserId(request: GatewayHttpRequest): string {
  const value = request.user?.userId;
  if (!value) throw new Error("gateway_verified_actor_state_incomplete");
  return value;
}

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new BadGatewayException(`media_response_${name}_invalid`);
  }
  return value;
}

function accessClass(value: string): GatewayMediaAccessClass {
  if (!(["PUBLIC", "PROTECTED", "STRICT"] as const).includes(value as GatewayMediaAccessClass)) {
    throw new BadGatewayException("media_response_access_class_invalid");
  }
  return value as GatewayMediaAccessClass;
}

function mediaRecord(value: media.Media | undefined): GatewayMediaDto {
  if (!value?.id || !value.path || !value.filename) {
    throw new BadGatewayException("media_response_invalid");
  }
  return Object.freeze({
    id: value.id, storage: value.storage, bucket: value.bucket, path: value.path,
    filename: value.filename, mimeType: value.mimeType, sizeBytes: value.sizeBytes,
    width: nonNegativeInteger(value.width, "width"), height: nonNegativeInteger(value.height, "height"),
    durationSec: nonNegativeInteger(value.durationSec, "duration"), ownerId: value.ownerId,
    visibility: value.visibility, scope: value.scope, sha256: value.sha256,
    createdAt: value.createdAt, updatedAt: value.updatedAt, status: value.status,
    scanStatus: value.scanStatus, quarantineReason: value.quarantineReason, etag: value.etag,
    promotedAt: value.promotedAt, accessClass: accessClass(value.accessClass),
    folderPath: value.folderPath, displayName: value.displayName,
    originalFilename: value.originalFilename, entityType: value.entityType, entityId: value.entityId,
  });
}

function laneRecords(values: readonly media.Media[], lane: GatewayMediaLane): readonly GatewayMediaDto[] {
  const policy = LANE_POLICY[lane];
  const mapped = values.map(mediaRecord);
  if (mapped.some((value) => value.accessClass !== policy.accessClass || value.visibility !== policy.visibility)) {
    throw new BadGatewayException("media_lane_response_violation");
  }
  return Object.freeze(mapped);
}

function presignResult(value: media.PresignUploadRes, lane: GatewayMediaLane): GatewayMediaPresignResultDto {
  const policy = LANE_POLICY[lane];
  if (!value.uploadUrl || !Number.isInteger(value.expiresIn) || value.expiresIn < 1 || value.accessClass !== policy.accessClass || value.visibility !== policy.visibility) {
    throw new BadGatewayException("media_presign_response_invalid");
  }
  return Object.freeze({
    storage: value.storage, bucket: value.bucket, path: value.path, uploadUrl: value.uploadUrl,
    expiresIn: value.expiresIn, filename: value.filename, mimeType: value.mimeType,
    visibility: value.visibility, scope: value.scope, accessClass: policy.accessClass,
    folderPath: value.folderPath, displayName: value.displayName,
    originalFilename: value.originalFilename, entityType: value.entityType,
    entityId: value.entityId, ownerId: value.ownerId,
  });
}

function readUrlResult(value: media.ReadUrlRes, expected: GatewayMediaAccessClass): GatewayMediaReadUrlResultDto {
  if (!value.url || !Number.isInteger(value.expiresIn) || value.expiresIn < 1 || value.accessClass !== expected) {
    throw new BadGatewayException("media_read_url_response_invalid");
  }
  return Object.freeze({
    url: value.url, expiresIn: value.expiresIn, accessClass: expected,
    filename: value.filename, mimeType: value.mimeType,
  });
}

function listInput(query: GatewayMediaAdminListQueryDto): Omit<media.ListReq, "$type"> {
  return {
    q: query.q ?? "", take: query.take ?? 0, skip: query.skip ?? 0,
    ownerId: query.ownerId ?? "", visibility: "", scope: query.scope ?? "",
    status: query.status ?? "", scanStatus: query.scanStatus ?? "", accessClass: "",
    folderPath: query.folderPath ?? "", entityType: query.entityType ?? "",
    entityId: query.entityId ?? "", search: query.search ?? "", path: query.path ?? "",
    mimeType: query.mimeType ?? "", mediaType: query.mediaType ?? "",
    sortBy: query.sortBy ?? "", order: query.order ?? "",
  };
}

function ownedListInput(query: GatewayMediaListQueryDto): Omit<media.ListMyProtectedLibraryReq, "$type"> {
  return {
    q: query.q ?? "", take: query.take ?? 0, skip: query.skip ?? 0,
    scope: query.scope ?? "", status: query.status ?? "", scanStatus: query.scanStatus ?? "",
    folderPath: query.folderPath ?? "", entityType: query.entityType ?? "",
    entityId: query.entityId ?? "", search: query.search ?? "", path: query.path ?? "",
    mimeType: query.mimeType ?? "", mediaType: query.mediaType ?? "",
    sortBy: query.sortBy ?? "", order: query.order ?? "",
  };
}

@Injectable()
export class GatewayMediaApiService {
  constructor(@Inject(MEDIA_SERVICE) private readonly client: ClientGrpc) {}

  private media(request: GatewayHttpRequest) {
    const downstream = createGatewayDownstreamContext(request, MEDIA_SERVICE_TARGET);
    return { proxy: getMedia(this.client, downstream.signingPolicy), metadata: downstream.metadata };
  }

  async get(request: GatewayHttpRequest, id: string) {
    const mediaClient = this.media(request);
    const mapped = mediaRecord((await wrapGrpc(firstValueFrom(mediaClient.proxy.GetById({ id }, mediaClient.metadata)))).media);
    if (mapped.id !== id) throw new BadGatewayException("media_response_identity_mismatch");
    return mapped;
  }

  private listCall(proxy: MediaProxy, lane: GatewayMediaLane, input: Omit<media.ListReq, "$type">, metadata: Parameters<MediaProxy["ListPublicLibrary"]>[1]) {
    if (lane === "public") return proxy.ListPublicLibrary(input, metadata);
    if (lane === "protected") return proxy.ListProtectedLibrary(input, metadata);
    return proxy.ListStrictLibrary(input, metadata);
  }

  async list(request: GatewayHttpRequest, lane: GatewayMediaLane, query: GatewayMediaAdminListQueryDto) {
    const mediaClient = this.media(request);
    const result = await wrapGrpc(firstValueFrom(this.listCall(mediaClient.proxy, lane, listInput(query), mediaClient.metadata)));
    return laneRecords(result.items, lane);
  }

  async listOwned(request: GatewayHttpRequest, query: GatewayMediaListQueryDto) {
    const userId = actorUserId(request);
    const mediaClient = this.media(request);
    const result = await wrapGrpc(firstValueFrom(mediaClient.proxy.ListMyProtectedLibrary(ownedListInput(query), mediaClient.metadata)));
    const mapped = laneRecords(result.items, "protected");
    if (mapped.some((value) => value.ownerId !== userId)) {
      throw new BadGatewayException("media_owned_response_violation");
    }
    return mapped;
  }

  private presignCall(proxy: MediaProxy, lane: GatewayMediaLane, input: Omit<media.PresignUploadReq, "$type">, metadata: Parameters<MediaProxy["PresignPublicLibraryUpload"]>[1]): Observable<media.PresignUploadRes> {
    if (lane === "public") return proxy.PresignPublicLibraryUpload(input, metadata);
    if (lane === "protected") return proxy.PresignProtectedLibraryUpload(input, metadata);
    return proxy.PresignStrictLibraryUpload(input, metadata);
  }

  async presign(request: GatewayHttpRequest, lane: GatewayMediaLane, input: GatewayMediaPresignDto) {
    const mediaClient = this.media(request);
    const body: Omit<media.PresignUploadReq, "$type"> = {
      filename: input.filename, mimeType: input.mimeType, ownerId: input.ownerId ?? "",
      visibility: "", scope: input.scope ?? "", accessClass: "",
      folderPath: input.folderPath ?? "", displayName: input.displayName ?? "",
      entityType: input.entityType ?? "", entityId: input.entityId ?? "",
    };
    return presignResult(await wrapGrpc(firstValueFrom(this.presignCall(mediaClient.proxy, lane, body, mediaClient.metadata))), lane);
  }

  private finalizeCall(proxy: MediaProxy, lane: GatewayMediaLane, input: Omit<media.FinalizeUploadReq, "$type">, metadata: Parameters<MediaProxy["FinalizePublicLibraryUpload"]>[1]) {
    if (lane === "public") return proxy.FinalizePublicLibraryUpload(input, metadata);
    if (lane === "protected") return proxy.FinalizeProtectedLibraryUpload(input, metadata);
    return proxy.FinalizeStrictLibraryUpload(input, metadata);
  }

  async finalize(request: GatewayHttpRequest, lane: GatewayMediaLane, input: GatewayMediaFinalizeDto) {
    const mediaClient = this.media(request);
    const body: Omit<media.FinalizeUploadReq, "$type"> = {
      storage: input.storage, bucket: input.bucket ?? "", path: input.path,
      filename: input.filename ?? "", mimeType: input.mimeType ?? "", visibility: "",
      scope: input.scope ?? "", ownerId: input.ownerId ?? "", sha256: input.sha256 ?? "",
      accessClass: "", folderPath: input.folderPath ?? "", displayName: input.displayName ?? "",
      originalFilename: input.originalFilename ?? "", entityType: input.entityType ?? "",
      entityId: input.entityId ?? "",
    };
    const mapped = mediaRecord((await wrapGrpc(firstValueFrom(this.finalizeCall(mediaClient.proxy, lane, body, mediaClient.metadata)))).media);
    const policy = LANE_POLICY[lane];
    if (mapped.accessClass !== policy.accessClass || mapped.visibility !== policy.visibility) {
      throw new BadGatewayException("media_lane_response_violation");
    }
    return mapped;
  }

  private readCall(proxy: MediaProxy, lane: GatewayMediaLane, input: Omit<media.ReadUrlReq, "$type">, metadata: Parameters<MediaProxy["CreatePublicLibraryReadUrl"]>[1]) {
    if (lane === "public") return proxy.CreatePublicLibraryReadUrl(input, metadata);
    if (lane === "protected") return proxy.CreateProtectedLibraryReadUrl(input, metadata);
    return proxy.CreateStrictLibraryReadUrl(input, metadata);
  }

  async readUrl(request: GatewayHttpRequest, lane: GatewayMediaLane, id: string, download: boolean) {
    const mediaClient = this.media(request);
    return readUrlResult(await wrapGrpc(firstValueFrom(this.readCall(mediaClient.proxy, lane, { id, download }, mediaClient.metadata))), LANE_POLICY[lane].accessClass);
  }

  async readOwnedUrl(request: GatewayHttpRequest, id: string, query: GatewayMediaOwnedReadUrlQueryDto) {
    actorUserId(request);
    const mediaClient = this.media(request);
    const result = await wrapGrpc(firstValueFrom(mediaClient.proxy.CreateMyProtectedReadUrl({
      id, scope: query.scope, entityType: query.entityType, entityId: query.entityId,
      download: query.download ?? false,
    }, mediaClient.metadata)));
    return readUrlResult(result, "PROTECTED");
  }

  async deleteLane(request: GatewayHttpRequest, lane: "protected" | "strict", id: string): Promise<GatewayMediaDeleteResultDto> {
    const mediaClient = this.media(request);
    const call = lane === "protected"
      ? mediaClient.proxy.DeleteProtectedLibraryById({ id }, mediaClient.metadata)
      : mediaClient.proxy.DeleteStrictLibraryById({ id }, mediaClient.metadata);
    const result = await wrapGrpc(firstValueFrom(call));
    if (typeof result.deleted !== "boolean") throw new BadGatewayException("media_delete_response_invalid");
    return Object.freeze({ deleted: result.deleted });
  }

  async previewPublicDelete(request: GatewayHttpRequest, input: GatewayMediaDeletePreviewDto): Promise<GatewayMediaDeletePreviewResultDto> {
    const mediaClient = this.media(request);
    const result = await wrapGrpc(firstValueFrom(mediaClient.proxy.PreviewPublicLibraryDelete({
      items: input.items.map((item) => ({ type: item.type, id: item.id ?? "", folderPath: item.folderPath ?? "" })),
      recursive: input.recursive ?? false, scope: input.scope ?? "",
    }, mediaClient.metadata)));
    if (!result.confirmToken || !Number.isInteger(result.expiresIn) || result.expiresIn < 1) {
      throw new BadGatewayException("media_delete_preview_response_invalid");
    }
    return Object.freeze({
      scope: result.scope, recursive: result.recursive, canDelete: result.canDelete,
      warnings: Object.freeze(result.warnings.map((value) => Object.freeze({ ...value }))),
      fileCount: nonNegativeInteger(result.fileCount, "delete_file_count"),
      folderCount: nonNegativeInteger(result.folderCount, "delete_folder_count"),
      totalSizeBytes: result.totalSizeBytes,
      folders: Object.freeze(result.folders.map((value) => Object.freeze({ ...value }))),
      files: Object.freeze(result.files.map((value) => Object.freeze({ ...value }))),
      confirmToken: result.confirmToken, expiresIn: result.expiresIn,
    });
  }

  async confirmPublicDelete(request: GatewayHttpRequest, input: GatewayMediaDeleteConfirmDto): Promise<GatewayMediaDeleteConfirmResultDto> {
    const mediaClient = this.media(request);
    const result = await wrapGrpc(firstValueFrom(mediaClient.proxy.ConfirmPublicLibraryDelete({
      items: input.items.map((item) => ({ type: item.type, id: item.id ?? "", folderPath: item.folderPath ?? "" })),
      recursive: input.recursive ?? false, scope: input.scope ?? "", confirmToken: input.confirmToken,
    }, mediaClient.metadata)));
    if (typeof result.deleted !== "boolean") throw new BadGatewayException("media_delete_confirm_response_invalid");
    return Object.freeze({
      deleted: result.deleted,
      fileCount: nonNegativeInteger(result.fileCount, "delete_file_count"),
      folderCount: nonNegativeInteger(result.folderCount, "delete_folder_count"),
      totalSizeBytes: result.totalSizeBytes,
    });
  }
}
