import {
  ANONYMOUS_ACTOR,
  actorFromVerifiedAuth,
  createGatewayRequestContext,
  isGlobalAdminActor,
} from "../src/application/application-context";
import {
  PUBLIC_APPLICATION_PROFILES,
  RESERVED_CONFIDENTIAL_APPLICATION_PROFILE,
} from "../src/application/application.contracts";
import { StaticApplicationRegistry } from "../src/application/application-registry";
import { TEST_APPLICATION_REGISTRY_JSON } from "./application-fixture";

describe("gateway application and actor context", () => {
  const registry = StaticApplicationRegistry.fromJson(
    TEST_APPLICATION_REGISTRY_JSON,
    { nodeEnv: "test" },
  );

  it("keeps application profile independent from anonymous/authenticated actor state", async () => {
    const application = await registry.resolve({
      clientId: "storefront-web-local",
      origin: "http://localhost:3008",
    });
    expect(application).not.toBeNull();

    const requestContext = createGatewayRequestContext(
      application!,
      "5d7067eb-2405-43f1-86c5-354bb54378e2",
    );
    const actor = actorFromVerifiedAuth({
      userId: "user-1",
      role: "user",
      sessionRef: "session-1",
    });

    expect(ANONYMOUS_ACTOR).toEqual({ kind: "anonymous" });
    expect(actor.kind).toBe("authenticated");
    expect(requestContext).toMatchObject({
      applicationProfile: "storefront-web",
      channelKind: "web",
    });
  });

  it("accepts only existing verified global admin roles for the F3 bridge", () => {
    expect(
      isGlobalAdminActor(
        actorFromVerifiedAuth({
          userId: "admin-1",
          role: "admin",
          sessionRef: "session-1",
        }),
      ),
    ).toBe(true);
    expect(
      isGlobalAdminActor(
        actorFromVerifiedAuth({
          userId: "root-1",
          role: "root-admin",
          sessionRef: "session-2",
        }),
      ),
    ).toBe(true);
    expect(
      isGlobalAdminActor(
        actorFromVerifiedAuth({
          userId: "user-1",
          role: "user",
          sessionRef: "session-3",
        }),
      ),
    ).toBe(false);
    expect(isGlobalAdminActor(ANONYMOUS_ACTOR)).toBe(false);
  });

  it("rejects actor and request identifiers outside the signed wire constraint", async () => {
    expect(() =>
      actorFromVerifiedAuth({
        userId: "unsafe value",
        role: "user",
        sessionRef: "session-1",
      }),
    ).toThrow(/safe signed-context identifier/);
    expect(() =>
      actorFromVerifiedAuth({
        userId: "user-1",
        role: "copied-admin" as "admin",
        sessionRef: "session-1",
      }),
    ).toThrow(/supported verified global role/);

    const application = await registry.resolve({
      clientId: "mobile-local",
    });
    expect(() =>
      createGatewayRequestContext(application!, "unsafe request id"),
    ).toThrow(/safe signed-context identifier/);
  });

  it("reserves confidential partner/server separately from public profiles", () => {
    expect(PUBLIC_APPLICATION_PROFILES).toEqual([
      "storefront-web",
      "admin-web",
      "mobile",
    ]);
    expect(RESERVED_CONFIDENTIAL_APPLICATION_PROFILE).toBe("partner-server");
    expect(PUBLIC_APPLICATION_PROFILES).not.toContain(
      RESERVED_CONFIDENTIAL_APPLICATION_PROFILE,
    );
  });
});
