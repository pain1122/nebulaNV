// settings.controller.ts
import {
  Body, Controller, Get, Put, Delete, Query, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { Public } from '@nebula/grpc-auth';
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

  // READ: world-readable (no S2S, no JWT)
  @Public()
  @Get('string')
  async getString(@Query() q: GetStringDto) {
    const res = await this.svc.getString(q.namespace, q.key, q.environment ?? 'default');
    return { value: res.value ?? '', found: res.found };
  }

  // WRITE: gateway-only (S2S), no JWT required
  @Public({ gatewayOnly: true })
  @Put('string')
  async setString(@Body() b: SetStringDto) {
    const v = await this.svc.setString(b.namespace, b.key, b.value, b.environment ?? 'default');
    return { value: v };
  }

  // WRITE: gateway-only (S2S), no JWT required
  @Public({ gatewayOnly: true })
  @Delete('string')
  async deleteString(@Query() q: DeleteStringDto) {
    await this.svc.deleteString(q.namespace, q.key, q.environment ?? 'default');
    return { deleted: true };
  }
}
