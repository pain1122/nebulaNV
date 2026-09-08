import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { deriveS2SSessionRef } from '@nebula/grpc-auth';
import { AuthRedisService } from '../redis/auth-redis.service';
import { type AccessTokenPayload, isAccessTokenPayload } from '../auth.types';

export type AccessTokenValidationResult =
  | { valid: true; payload: AccessTokenPayload; sessionRef: string }
  | {
      valid: false;
      reason:
        | 'missing_access_secret'
        | 'invalid_access_token'
        | 'user_disabled'
        | 'token_version_mismatch'
        | 'session_revoked';
    };

@Injectable()
export class AccessTokenValidationService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authRedis: AuthRedisService,
  ) {}

  async validate(token: string): Promise<AccessTokenValidationResult> {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      return { valid: false, reason: 'missing_access_secret' };
    }

    let payload: AccessTokenPayload;

    try {
      const verified: unknown = this.jwt.verify(token, { secret });
      if (!isAccessTokenPayload(verified)) {
        return { valid: false, reason: 'invalid_access_token' };
      }
      payload = verified;
    } catch {
      return { valid: false, reason: 'invalid_access_token' };
    }

    if (await this.authRedis.isUserDisabled(payload.sub)) {
      return { valid: false, reason: 'user_disabled' };
    }

    const currentVersion = await this.authRedis.getTokenVersion(payload.sub);
    if (payload.tv !== currentVersion) {
      return { valid: false, reason: 'token_version_mismatch' };
    }

    if (!(await this.authRedis.hasRefreshSession(payload.sub, payload.sid))) {
      return { valid: false, reason: 'session_revoked' };
    }

    return {
      valid: true,
      payload,
      sessionRef: deriveS2SSessionRef(secret, payload.sid),
    };
  }
}
