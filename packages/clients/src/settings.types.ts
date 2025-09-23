import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';

export type GetStringReq = { namespace: string; environment?: string; key: string };
export type GetStringRes = { value: string; found?: boolean };
export type SetStringReq = { namespace: string; environment?: string; key: string; value: string };

export interface SettingsProxy {
  GetString(req: GetStringReq, meta?: Metadata): Observable<GetStringRes>;
  SetString(req: SetStringReq, meta?: Metadata): Observable<unknown>;
  DeleteString(req: { namespace: string; environment?: string; key: string }, meta?: Metadata): Observable<unknown>;
}
