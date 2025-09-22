import { Controller, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Public } from '@nebula/grpc-auth';
import { SettingsService } from '../settings.service';
import { settings } from '@nebula/protos';
import { S2SGuard } from '@nebula/grpc-auth';

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller()
@UsePipes(Pipe)
export class SettingsGrpcController {
  constructor(private readonly svc: SettingsService) {}

  @Public()
  @UseGuards(S2SGuard)
  @GrpcMethod('SettingsService', 'GetString')
  async getString(req: settings.GetReq): Promise<settings.GetStringRes> {
    const env = req.environment?.trim() ? req.environment : 'default';
    const { value, found } = await this.svc.getString(req.namespace, req.key, env);
    return settings.GetStringRes.create({ value: value ?? '', found });
    // or: return settings.GetStringRes.fromPartial({ value: value ?? '', found });
  }

  @Public()
  @UseGuards(S2SGuard)
  @GrpcMethod('SettingsService', 'SetString')
  async setString(req: settings.SetStringReq): Promise<settings.SetStringRes> {
    const env = req.environment?.trim() ? req.environment : 'default';
    const value = await this.svc.setString(req.namespace, req.key, req.value, env);
    return settings.SetStringRes.create({ value });
  }

  @Public()
  @UseGuards(S2SGuard)
  @GrpcMethod('SettingsService', 'DeleteString')
  async deleteString(req: settings.DeleteReq): Promise<settings.DeleteRes> {
    const env = req.environment?.trim() ? req.environment : 'default';
    const deleted = await this.svc.deleteString(req.namespace, req.key, env);
    return settings.DeleteRes.create({ deleted });
  }
}
