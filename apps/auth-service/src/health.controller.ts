import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
