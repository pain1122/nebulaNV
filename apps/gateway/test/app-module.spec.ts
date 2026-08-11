import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { AppModule, GATEWAY_HTTP_CONTROLLERS } from "../src/app.module";
import { GatewayReadinessService } from "../src/gateway-readiness.service";
import { bootstrap } from "../src/main";

describe("gateway application module", () => {
  let moduleRef: TestingModule;

  afterEach(async () => {
    await moduleRef?.close();
  });

  it("boots its dependency-free foundation with validated defaults", async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(ConfigService).get("GATEWAY_JSON_LIMIT_BYTES")).toBe(
      262_144,
    );
    expect(moduleRef.get(GatewayReadinessService).probes()).toHaveLength(1);
    expect(GATEWAY_HTTP_CONTROLLERS).toEqual([]);
  });

  it("exports the real bootstrap without starting a listener when imported", () => {
    expect(bootstrap).toEqual(expect.any(Function));
  });
});
