import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: Redis,
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
          password: process.env.REDIS_PASSWORD || undefined,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [Redis],
})
export class RedisModule {}
