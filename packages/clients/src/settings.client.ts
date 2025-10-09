import type { ClientGrpc } from '@nestjs/microservices';
import { buildS2SMetadata } from '@nebula/grpc-auth';
import type { Observable } from 'rxjs';
import type { SettingsProxy, GetStringReq, SetStringReq, GetStringRes } from './settings.types';

type Raw = {
  GetString(req: GetStringReq): Observable<GetStringRes>;
  SetString(req: SetStringReq): Observable<unknown>;
  DeleteString(req: { namespace: string; environment?: string; key: string }): Observable<unknown>;
};

export function getSettings(client: ClientGrpc): SettingsProxy {
  const raw = client.getService<Raw>('SettingsService') as any;
  const meta = () => buildS2SMetadata({ serviceName: process.env.SVC_NAME });
  return {
    GetString: (req, m) => raw.GetString(req, m ?? meta()),
    SetString: (req, m) => raw.SetString(req, m ?? meta()),
    DeleteString: (req, m) => raw.DeleteString(req, m ?? meta()),
  };
}
