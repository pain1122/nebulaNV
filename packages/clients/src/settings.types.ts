// packages/clients/src/settings.types.ts
import type { Metadata, CallOptions } from "@grpc/grpc-js";
import type { settings } from "@nebula/protos";
import type { Observable } from "rxjs";

export type GetStringReq = {
  namespace: string;
  key: string;
  environment?: string;
};

export type GetStringRes = {
  value: string;
  found?: boolean;
};

export type SetStringReq = {
  namespace: string;
  key: string;
  value: string;
  environment?: string;
};

export type SetStringRes = {
  value: string;
};

export type DeleteStringReq = {
  namespace: string;
  key: string;
  environment?: string;
};

export type DeleteStringRes = {
  deleted: boolean;
};

export type EnsureBootstrapStringReq = Omit<settings.SetStringReq, "$type">;
export type EnsureBootstrapStringRes = settings.SetStringRes;

export interface SettingsProxy {
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
}
