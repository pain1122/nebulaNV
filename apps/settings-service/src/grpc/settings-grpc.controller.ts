import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SettingsService } from '../settings.service';

type GetReq = { namespace: string; environment?: string; key: string };
type GetStringRes = { value: string; found: boolean };
type SetStringReq = { namespace: string; environment?: string; key: string; value: string };
type SetStringRes = { value: string };

@Controller()
export class SettingsGrpcController {
  constructor(private svc: SettingsService) {}

  @GrpcMethod('SettingsService', 'GetString')
  async GetString(req: GetReq): Promise<GetStringRes> {
    const env = req.environment?.trim() || 'default';
    return this.svc.getString(req.namespace.trim(), req.key.trim(), env);
  }

  @GrpcMethod('SettingsService', 'SetString')
  async SetString(req: SetStringReq): Promise<SetStringRes> {
    const env = req.environment?.trim() || 'default';
    return this.svc.setString(req.namespace.trim(), req.key.trim(), req.value ?? '', env);
  }
}
