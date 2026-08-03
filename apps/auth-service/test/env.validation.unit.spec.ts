import { envSchema } from '../src/config/env.validation';

const baseEnvironment = {
  S2S_OUTBOUND_KEYS: '{}',
  S2S_INBOUND_KEYS: '{}',
  GATEWAY_INBOUND_KEYS: '{}',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'r'.repeat(32),
};

describe('auth environment validation', () => {
  it('requires separate access and refresh signing secrets', () => {
    expect(envSchema.validate(baseEnvironment).error).toBeUndefined();

    const { JWT_REFRESH_SECRET: _removed, ...missingRefreshSecret } =
      baseEnvironment;
    expect(envSchema.validate(missingRefreshSecret).error).toBeDefined();
  });

  it('applies bounded auth defaults and rejects ambiguous token durations', () => {
    const result = envSchema.validate(baseEnvironment);

    expect(result.value).toMatchObject({
      JWT_ACCESS_EXPIRATION: '15m',
      JWT_REFRESH_EXPIRATION: '7d',
      BCRYPT_ROUNDS: 10,
    });
    expect(
      envSchema.validate({
        ...baseEnvironment,
        JWT_REFRESH_EXPIRATION: '900',
      }).error,
    ).toBeDefined();
  });
});
