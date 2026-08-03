import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import {
  SETTINGS_SERVICE_TARGET,
  buildGrpcS2SMetadata,
  invokeGrpcUnary,
  mergeSignedMetadata,
} from "@nebula/grpc-auth";
import { settings } from "@nebula/protos";
import type { Observable } from "rxjs";
import type {
  DeleteStringReq,
  DeleteStringRes,
  EnsureBootstrapStringReq,
  EnsureBootstrapStringRes,
  GetStringReq,
  GetStringRes,
  SettingsProxy,
  SetStringReq,
  SetStringRes,
} from "./settings.types";

type Raw = {
  GetString(
    req: GetStringReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<GetStringRes>;
  SetString(
    req: SetStringReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<SetStringRes>;
  DeleteString(
    req: DeleteStringReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<DeleteStringRes>;
  EnsureBootstrapString(
    req: EnsureBootstrapStringReq,
    meta?: Metadata,
    opts?: CallOptions,
  ): Observable<EnsureBootstrapStringRes>;
};

export function getSettings(client: ClientGrpc): SettingsProxy {
  const raw = client.getService<Raw>("SettingsService");
  return {
    GetString: (req, m, opts) =>
      invokeGrpcUnary(
        raw.GetString.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: SETTINGS_SERVICE_TARGET,
            definition: settings.SettingsServiceService.getString,
            request: req,
          }),
        ),
        opts,
      ),
    SetString: (req, m, opts) =>
      invokeGrpcUnary(
        raw.SetString.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: SETTINGS_SERVICE_TARGET,
            definition: settings.SettingsServiceService.setString,
            request: req,
          }),
        ),
        opts,
      ),
    DeleteString: (req, m, opts) =>
      invokeGrpcUnary(
        raw.DeleteString.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: SETTINGS_SERVICE_TARGET,
            definition: settings.SettingsServiceService.deleteString,
            request: req,
          }),
        ),
        opts,
      ),
    EnsureBootstrapString: (req, m, opts) =>
      invokeGrpcUnary(
        raw.EnsureBootstrapString.bind(raw),
        req,
        mergeSignedMetadata(
          m,
          buildGrpcS2SMetadata({
            target: SETTINGS_SERVICE_TARGET,
            definition: settings.SettingsServiceService.ensureBootstrapString,
            request: req,
          }),
        ),
        opts,
      ),
  };
}
