// settings.controller.ts
import {
  Body, Controller, Get, Put, Delete, Query, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { Roles, Public } from '@nebula/grpc-auth';
import { SettingsService } from './settings.service';
import { GetStringDto } from './dto/get-string.dto';
import { SetStringDto } from './dto/set-string.dto';
import { DeleteStringDto } from './dto/delete-string.dto';

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

@Controller('settings')
@UsePipes(Pipe)
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  // Reads: choose ONE strategy:
  // (A) Public + GATEWAY_ONLY mode (recommended for s2s without tokens)
  // (B) Protected + require service token metadata from callers
  //
  // If you pick (A), keep @Public() and set PUBLIC_MODE=GATEWAY_ONLY on this service.

  // (A) Public read (gateway-signed)
  @Public()
  @Get('string')
  async getString(@Query() q: GetStringDto) {
    const res = await this.svc.getString(q.namespace, q.key, q.environment ?? 'default');
    return { value: res.value ?? '', found: res.found };
  }

  // Writes should not be public; restrict to admins
  @Roles('admin')
  @Put('string')
  async setString(@Body() b: SetStringDto) {
    const v = await this.svc.setString(b.namespace, b.key, b.value, b.environment ?? 'default');
    return { value: v };
  }

  @Roles('admin')
  @Delete('string')
  async deleteString(@Query() q: DeleteStringDto) {
    await this.svc.deleteString(q.namespace, q.key, q.environment ?? 'default');
    return { deleted: true };
  }
}
