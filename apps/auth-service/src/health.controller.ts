import { Controller, Get } from '@nestjs/common';
import { Public } from '@nebula/grpc-auth';


@Controller('health')
export class HealthController {
  @Get()
  @Public()
  async check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
