import type { ClientGrpc } from "@nestjs/microservices";
import { MEDIA_SERVICE_TARGET } from "@nebula/grpc-auth";
import { media } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type Raw = {
  GetById: RawGrpcUnary<media.GetByIdReq, media.MediaRes>;
  ListPublicLibrary: RawGrpcUnary<media.ListReq, media.ListRes>;
  ListProtectedLibrary: RawGrpcUnary<media.ListReq, media.ListRes>;
  ListStrictLibrary: RawGrpcUnary<media.ListReq, media.ListRes>;
  ListMyProtectedLibrary: RawGrpcUnary<
    media.ListMyProtectedLibraryReq,
    media.ListRes
  >;
  PresignPublicLibraryUpload: RawGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  PresignProtectedLibraryUpload: RawGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  PresignStrictLibraryUpload: RawGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  FinalizePublicLibraryUpload: RawGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  FinalizeProtectedLibraryUpload: RawGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  FinalizeStrictLibraryUpload: RawGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  CreatePublicLibraryReadUrl: RawGrpcUnary<media.ReadUrlReq, media.ReadUrlRes>;
  CreateProtectedLibraryReadUrl: RawGrpcUnary<
    media.ReadUrlReq,
    media.ReadUrlRes
  >;
  CreateStrictLibraryReadUrl: RawGrpcUnary<media.ReadUrlReq, media.ReadUrlRes>;
  CreateMyProtectedReadUrl: RawGrpcUnary<
    media.CreateMyProtectedReadUrlReq,
    media.ReadUrlRes
  >;
  DeleteProtectedLibraryById: RawGrpcUnary<
    media.DeleteByIdReq,
    media.DeleteRes
  >;
  DeleteStrictLibraryById: RawGrpcUnary<media.DeleteByIdReq, media.DeleteRes>;
  PreviewPublicLibraryDelete: RawGrpcUnary<
    media.PreviewPublicLibraryDeleteReq,
    media.PreviewPublicLibraryDeleteRes
  >;
  ConfirmPublicLibraryDelete: RawGrpcUnary<
    media.ConfirmPublicLibraryDeleteReq,
    media.ConfirmPublicLibraryDeleteRes
  >;
};

export interface MediaProxy {
  GetById: SignedGrpcUnary<media.GetByIdReq, media.MediaRes>;
  ListPublicLibrary: SignedGrpcUnary<media.ListReq, media.ListRes>;
  ListProtectedLibrary: SignedGrpcUnary<media.ListReq, media.ListRes>;
  ListStrictLibrary: SignedGrpcUnary<media.ListReq, media.ListRes>;
  ListMyProtectedLibrary: SignedGrpcUnary<
    media.ListMyProtectedLibraryReq,
    media.ListRes
  >;
  PresignPublicLibraryUpload: SignedGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  PresignProtectedLibraryUpload: SignedGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  PresignStrictLibraryUpload: SignedGrpcUnary<
    media.PresignUploadReq,
    media.PresignUploadRes
  >;
  FinalizePublicLibraryUpload: SignedGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  FinalizeProtectedLibraryUpload: SignedGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  FinalizeStrictLibraryUpload: SignedGrpcUnary<
    media.FinalizeUploadReq,
    media.MediaRes
  >;
  CreatePublicLibraryReadUrl: SignedGrpcUnary<
    media.ReadUrlReq,
    media.ReadUrlRes
  >;
  CreateProtectedLibraryReadUrl: SignedGrpcUnary<
    media.ReadUrlReq,
    media.ReadUrlRes
  >;
  CreateStrictLibraryReadUrl: SignedGrpcUnary<
    media.ReadUrlReq,
    media.ReadUrlRes
  >;
  CreateMyProtectedReadUrl: SignedGrpcUnary<
    media.CreateMyProtectedReadUrlReq,
    media.ReadUrlRes
  >;
  DeleteProtectedLibraryById: SignedGrpcUnary<
    media.DeleteByIdReq,
    media.DeleteRes
  >;
  DeleteStrictLibraryById: SignedGrpcUnary<
    media.DeleteByIdReq,
    media.DeleteRes
  >;
  PreviewPublicLibraryDelete: SignedGrpcUnary<
    media.PreviewPublicLibraryDeleteReq,
    media.PreviewPublicLibraryDeleteRes
  >;
  ConfirmPublicLibraryDelete: SignedGrpcUnary<
    media.ConfirmPublicLibraryDeleteReq,
    media.ConfirmPublicLibraryDeleteRes
  >;
}

export function getMedia(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): MediaProxy {
  const raw = client.getService<Raw>("MediaService");
  const common = { policy: signingPolicy, target: MEDIA_SERVICE_TARGET };
  return {
    GetById: createSignedGrpcUnary({
      ...common,
      method: raw.GetById.bind(raw),
      definition: media.MediaServiceService.getById,
    }),
    ListPublicLibrary: createSignedGrpcUnary({
      ...common,
      method: raw.ListPublicLibrary.bind(raw),
      definition: media.MediaServiceService.listPublicLibrary,
    }),
    ListProtectedLibrary: createSignedGrpcUnary({
      ...common,
      method: raw.ListProtectedLibrary.bind(raw),
      definition: media.MediaServiceService.listProtectedLibrary,
    }),
    ListStrictLibrary: createSignedGrpcUnary({
      ...common,
      method: raw.ListStrictLibrary.bind(raw),
      definition: media.MediaServiceService.listStrictLibrary,
    }),
    ListMyProtectedLibrary: createSignedGrpcUnary({
      ...common,
      method: raw.ListMyProtectedLibrary.bind(raw),
      definition: media.MediaServiceService.listMyProtectedLibrary,
    }),
    PresignPublicLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.PresignPublicLibraryUpload.bind(raw),
      definition: media.MediaServiceService.presignPublicLibraryUpload,
    }),
    PresignProtectedLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.PresignProtectedLibraryUpload.bind(raw),
      definition: media.MediaServiceService.presignProtectedLibraryUpload,
    }),
    PresignStrictLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.PresignStrictLibraryUpload.bind(raw),
      definition: media.MediaServiceService.presignStrictLibraryUpload,
    }),
    FinalizePublicLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.FinalizePublicLibraryUpload.bind(raw),
      definition: media.MediaServiceService.finalizePublicLibraryUpload,
    }),
    FinalizeProtectedLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.FinalizeProtectedLibraryUpload.bind(raw),
      definition: media.MediaServiceService.finalizeProtectedLibraryUpload,
    }),
    FinalizeStrictLibraryUpload: createSignedGrpcUnary({
      ...common,
      method: raw.FinalizeStrictLibraryUpload.bind(raw),
      definition: media.MediaServiceService.finalizeStrictLibraryUpload,
    }),
    CreatePublicLibraryReadUrl: createSignedGrpcUnary({
      ...common,
      method: raw.CreatePublicLibraryReadUrl.bind(raw),
      definition: media.MediaServiceService.createPublicLibraryReadUrl,
    }),
    CreateProtectedLibraryReadUrl: createSignedGrpcUnary({
      ...common,
      method: raw.CreateProtectedLibraryReadUrl.bind(raw),
      definition: media.MediaServiceService.createProtectedLibraryReadUrl,
    }),
    CreateStrictLibraryReadUrl: createSignedGrpcUnary({
      ...common,
      method: raw.CreateStrictLibraryReadUrl.bind(raw),
      definition: media.MediaServiceService.createStrictLibraryReadUrl,
    }),
    CreateMyProtectedReadUrl: createSignedGrpcUnary({
      ...common,
      method: raw.CreateMyProtectedReadUrl.bind(raw),
      definition: media.MediaServiceService.createMyProtectedReadUrl,
    }),
    DeleteProtectedLibraryById: createSignedGrpcUnary({
      ...common,
      method: raw.DeleteProtectedLibraryById.bind(raw),
      definition: media.MediaServiceService.deleteProtectedLibraryById,
    }),
    DeleteStrictLibraryById: createSignedGrpcUnary({
      ...common,
      method: raw.DeleteStrictLibraryById.bind(raw),
      definition: media.MediaServiceService.deleteStrictLibraryById,
    }),
    PreviewPublicLibraryDelete: createSignedGrpcUnary({
      ...common,
      method: raw.PreviewPublicLibraryDelete.bind(raw),
      definition: media.MediaServiceService.previewPublicLibraryDelete,
    }),
    ConfirmPublicLibraryDelete: createSignedGrpcUnary({
      ...common,
      method: raw.ConfirmPublicLibraryDelete.bind(raw),
      definition: media.MediaServiceService.confirmPublicLibraryDelete,
    }),
  };
}
