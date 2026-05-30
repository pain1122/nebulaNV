import type { CallOptions, Metadata } from "@grpc/grpc-js";
import type { ClientGrpc } from "@nestjs/microservices";
import { buildS2SMetadata } from "@nebula/grpc-auth";
import type { Observable } from "rxjs";
import type {
  DeleteStringReq,
  DeleteStringRes,
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
};

export function getSettings(client: ClientGrpc): SettingsProxy {
  const raw = client.getService<Raw>("SettingsService");
  const meta = () => buildS2SMetadata({ serviceName: process.env.SVC_NAME });
  return {
    GetString: (req, m, opts) => raw.GetString(req, m ?? meta(), opts),
    SetString: (req, m, opts) => raw.SetString(req, m ?? meta(), opts),
    DeleteString: (req, m, opts) => raw.DeleteString(req, m ?? meta(), opts),
  };
}
