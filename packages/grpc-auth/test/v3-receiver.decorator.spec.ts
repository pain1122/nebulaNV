import "reflect-metadata";
import { PATTERN_METADATA } from "@nestjs/microservices/constants";
import { GrpcMethod } from "@nestjs/microservices";
import { ROLES_KEY, Roles } from "../src/roles.decorator";
import { S2S_CONTEXT_RECEIVER_KEY } from "../src/public.decorator";
import { DormantS2SAuthorizationV3Receiver } from "../src/v3-receiver.decorator";

class ReceiverFixture {
  @DormantS2SAuthorizationV3Receiver("FixtureService", "WriteV3")
  @Roles("admin")
  @GrpcMethod("FixtureService", "Write")
  write(value: string): string {
    return `handled:${value}`;
  }
}

describe("dormant authorization v3 receiver", () => {
  it("registers a distinct alias with copied policy and exact receiver metadata", () => {
    const prototype = ReceiverFixture.prototype as ReceiverFixture &
      Record<string, (value: string) => string>;
    const original = prototype.write;
    const alias = prototype.write__r5_v3;

    expect(alias).not.toBe(original);
    expect(alias.call(new ReceiverFixture(), "value")).toBe("handled:value");
    expect(Reflect.getMetadata(ROLES_KEY, original)).toEqual(["admin"]);
    expect(Reflect.getMetadata(ROLES_KEY, alias)).toEqual(["admin"]);
    expect(
      Reflect.getMetadata(S2S_CONTEXT_RECEIVER_KEY, original),
    ).toBeUndefined();
    expect(Reflect.getMetadata(S2S_CONTEXT_RECEIVER_KEY, alias)).toEqual({
      version: "3",
      purpose: "AUTHORIZATION",
      resolutionStage: "AUTHORIZED",
      requireActor: true,
    });
    expect(Reflect.getMetadata(PATTERN_METADATA, original)).toEqual([
      { service: "FixtureService", rpc: "Write", streaming: "no_stream" },
    ]);
    expect(Reflect.getMetadata(PATTERN_METADATA, alias)).toEqual([
      { service: "FixtureService", rpc: "WriteV3", streaming: "no_stream" },
    ]);
  });

  it("rejects invalid transport names", () => {
    expect(() =>
      DormantS2SAuthorizationV3Receiver("bad service", "WriteV3"),
    ).toThrow("s2s_v3_receiver_name_invalid");
  });
});
