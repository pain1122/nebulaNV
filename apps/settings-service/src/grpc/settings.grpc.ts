import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SettingsService } from '../settings.service';

@Controller()
export class SettingsGrpcController {
  constructor(private readonly svc: SettingsService) {}

  @GrpcMethod('SettingsService', 'GetString')
  async getString(req: { namespace: string; environment?: string; key: string }) {
    const value = await this.svc.getString(req.namespace, req.key, req.environment ?? 'default');
    return { value: value ?? '' };
  }

  @GrpcMethod('SettingsService', 'SetString')
  async setString(req: { namespace: string; environment?: string; key: string; value: string }) {
    const value = await this.svc.setString(req.namespace, req.key, req.value, req.environment ?? 'default');
    return { value };
  }
}