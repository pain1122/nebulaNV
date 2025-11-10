import { Controller, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import { Public, Roles, resolveCtxUser, toRpc } from '@nebula/grpc-auth';
import { SettingsService } from '../settings.service';
import { settings } from '@nebula/protos';

const Pipe = new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
@UsePipes(Pipe)
export class SettingsGrpcController {
  private readonly log = new Logger(SettingsGrpcController.name);
  constructor(private readonly svc: SettingsService) {}

  // Read can remain public
  @Public()
  @GrpcMethod('SettingsService', 'GetString')
  async getString(req: settings.GetReq): Promise<settings.GetStringRes> {
    const env = req.environment?.trim() ? req.environment : 'default';
    const { value, found } = await this.svc.getString(req.namespace, req.key, env);
    return settings.GetStringRes.create({ value: value ?? '', found });
  }

  // Writes: require admin/root-admin via JWT context
  @Roles('admin', 'root-admin')
  @GrpcMethod('SettingsService', 'SetString')
  async setString(req: settings.SetStringReq, meta: Metadata, call: any): Promise<settings.SetStringRes> {
    const ctx = resolveCtxUser(meta, call);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    const env = req.environment?.trim() ? req.environment : 'default';
    const value = await this.svc.setString(req.namespace, req.key, req.value, env);
    this.log.debug(`[SettingsService] SetString ${req.namespace}/${req.key}=${req.value}`);
    return settings.SetStringRes.create({ value });
  }

  @Roles('admin', 'root-admin')
  @GrpcMethod('SettingsService', 'DeleteString')
  async deleteString(req: settings.DeleteReq, meta: Metadata, call: any): Promise<settings.DeleteRes> {
    const ctx = resolveCtxUser(meta, call);
    if (!ctx) throw toRpc(status.UNAUTHENTICATED, 'Missing user context');
    const env = req.environment?.trim() ? req.environment : 'default';
    const deleted = await this.svc.deleteString(req.namespace, req.key, env);
    this.log.debug(`[SettingsService] DeleteString ${req.namespace}/${req.key} → ${deleted}`);
    return settings.DeleteRes.create({ deleted });
  }
}
