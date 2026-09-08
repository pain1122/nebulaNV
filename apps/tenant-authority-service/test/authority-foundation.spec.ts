import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";
import { envSchema } from "../src/config/env.validation";

describe("tenant-authority-service foundation", () => {
  it("accepts only the dedicated runtime role and database", () => {
    const trust = {
      AUTH_GRPC_URL: "127.0.0.1:50052",
      S2S_OUTBOUND_KEYS: "{}",
      S2S_INBOUND_KEYS: "{}",
      GATEWAY_INBOUND_KEYS:
        '{"gateway":{"current":{"id":"gateway-authority-test","secret":"gateway-authority-test-secret-00000001"}}}',
      AUTHORITY_AUDIT_HMAC_KEY_ID: "authority-audit-test-v1",
      AUTHORITY_AUDIT_HMAC_KEY: "authority-audit-test-secret-000000001",
      AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID:
        "authority-membership-epoch-test-v1",
      AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY:
        "authority-membership-epoch-test-secret-001",
    };
    const accepted = envSchema.validate({
      NODE_ENV: "production",
      TENANT_AUTHORITY_HTTP_PORT: 3011,
      TENANT_AUTHORITY_GRPC_PORT: 50059,
      ...trust,
      DATABASE_URL:
        "postgresql://nebula_authority_runtime:strong_runtime_password_123456789@postgres:5432/nebula_authority?schema=public",
    });
    expect(accepted.error).toBeUndefined();

    for (const databaseUrl of [
      "postgresql://postgres:strong_runtime_password_123456789@postgres:5432/nebula_authority?schema=public",
      "postgresql://nebula_authority_runtime:strong_runtime_password_123456789@postgres:5432/nebula_users?schema=public",
      "postgresql://nebula_authority_runtime@postgres:5432/nebula_authority?schema=public",
      "postgresql://nebula_authority_runtime:short-password@postgres:5432/nebula_authority?schema=public",
    ]) {
      expect(
        envSchema.validate({
          NODE_ENV: "production",
          ...trust,
          DATABASE_URL: databaseUrl,
        }).error,
      ).toBeDefined();
    }
  });

  it("requires the Auth gRPC target used by the shared token guard", () => {
    const result = envSchema.validate({
      NODE_ENV: "production",
      TENANT_AUTHORITY_HTTP_PORT: 3011,
      TENANT_AUTHORITY_GRPC_PORT: 50059,
      S2S_OUTBOUND_KEYS: "{}",
      S2S_INBOUND_KEYS: "{}",
      GATEWAY_INBOUND_KEYS:
        '{"gateway":{"current":{"id":"gateway-authority-test","secret":"gateway-authority-test-secret-00000001"}}}',
      AUTHORITY_AUDIT_HMAC_KEY_ID: "authority-audit-test-v1",
      AUTHORITY_AUDIT_HMAC_KEY: "authority-audit-test-secret-000000001",
      AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY_ID:
        "authority-membership-epoch-test-v1",
      AUTHORITY_MEMBERSHIP_EPOCH_HMAC_KEY:
        "authority-membership-epoch-test-secret-001",
      DATABASE_URL:
        "postgresql://nebula_authority_runtime:strong_runtime_password_123456789@postgres:5432/nebula_authority?schema=public",
    });

    expect(result.error?.message).toContain("AUTH_GRPC_URL");
  });

  it("delegates readiness to the repository migration check", async () => {
    const assertRequiredMigrationsReady = jest.fn<Promise<void>, []>();
    assertRequiredMigrationsReady.mockResolvedValue(undefined);
    const service = new AuthorityService({
      assertRequiredMigrationsReady,
    } as unknown as AuthorityRepository);

    await expect(service.checkReadiness()).resolves.toBeUndefined();
    expect(assertRequiredMigrationsReady).toHaveBeenCalledTimes(1);
  });
});
