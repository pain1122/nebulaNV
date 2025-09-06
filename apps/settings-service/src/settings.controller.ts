import { Controller, Get, Put, Query, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get('string')
  getString(@Query('ns') ns: string, @Query('key') key: string, @Query('env') env = 'default') {
    return this.svc.getString(ns, key, env).then(value => ({ value }));
  }

  @Put('string')
  setString(@Body() b: { ns: string; key: string; value: string; env?: string }) {
    return this.svc.setString(b.ns, b.key, b.value, b.env || 'default').then(value => ({ value }));
  }
}