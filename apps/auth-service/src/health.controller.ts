import { Controller, Get } from '@nestjs/common';
import { Public } from '@nebula/grpc-auth';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
