import { Controller } from '@nestjs/common';
import { type HealthProbe, StandardHealthController } from '@packages/config';
import { Public, S2SReplayStore } from '@nebula/grpc-auth';
import { AuthRedisService } from './auth/redis/auth-redis.service';

@Public()
@Controller('health')
export class HealthController extends StandardHealthController {
  constructor(
    private readonly authRedis: AuthRedisService,
    private readonly replayStore: S2SReplayStore,
  ) {
    super('auth-service');
  }

  protected readinessProbes(): readonly HealthProbe[] {
    return [
      {
        name: 'authRedis',
        check: () => this.authRedis.checkReadiness(),
      },
      {
        name: 's2sReplay',
        check: () => this.replayStore.checkReadiness(),
      },
    ];
  }
}
