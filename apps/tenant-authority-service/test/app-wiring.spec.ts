import { Test } from "@nestjs/testing";

describe("tenant-authority-service application wiring", () => {
  it("resolves the shared gRPC guards and their Auth client", async () => {
    Object.assign(process.env, {
      NODE_ENV: "test",
      TENANT_AUTHORITY_HTTP_PORT: "3011",
      TENANT_AUTHORITY_GRPC_PORT: "50059",
      AUTH_GRPC_URL: "127.0.0.1:50052",
      SVC_NAME: "tenant-authority-service",
      PUBLIC_MODE: "GATEWAY_ONLY",
      S2S_REPLAY_STORE: "memory",
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
        "postgresql://nebula_authority_runtime:strong_runtime_password_123456789@127.0.0.1:15432/nebula_authority?schema=public",
    });

    const { AppModule } = await import("../src/app.module");
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    await moduleRef.close();
  });
});
