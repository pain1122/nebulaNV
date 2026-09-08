import { readFileSync } from "node:fs";
import path from "node:path";
import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";

const tenantId = "10000000-0000-4000-8000-000000000001";
const otherTenantId = "10000000-0000-4000-8000-000000000002";
const siteId = "20000000-0000-4000-8000-000000000001";
const applicationId = "30000000-0000-4000-8000-000000000001";
const channelId = "40000000-0000-4000-8000-000000000001";
const clientId = "50000000-0000-4000-8000-000000000001";
const entitlementRef = "60000000-0000-4000-8000-000000000001";

function webApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: applicationId,
    clientId,
    tenantId,
    siteId,
    channelId,
    displayName: "Storefront",
    profile: "STOREFRONT_WEB",
    lifecycle: "ACTIVE",
    revision: 4n,
    createdAt: new Date(),
    updatedAt: new Date(),
    channel: {
      id: channelId,
      tenantId,
      siteId,
      kind: "WEB",
      createdAt: new Date(),
      updatedAt: new Date(),
      site: {
        id: siteId,
        tenantId,
        displayName: "Main",
        lifecycle: "ACTIVE",
        isPrimary: true,
        revision: 3n,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {
          id: tenantId,
          displayName: "Main tenant",
          lifecycle: "ACTIVE",
          revision: 2n,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
    webOrigins: [{ canonicalOrigin: "https://shop.example:443" }],
    androidIdentities: [],
    iosIdentities: [],
    ...overrides,
  };
}

describe("typed tenant authority reads", () => {
  it("resolves only an active application with exact verified identity", async () => {
    const repository = {
      findApplicationByClientId: jest.fn().mockResolvedValue(webApplication()),
    } as unknown as AuthorityRepository;
    const service = new AuthorityService(repository);

    await expect(
      service.resolveApplicationRegistration(
        clientId,
        "https://shop.example:443",
      ),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      registration: {
        applicationId,
        tenantId,
        siteId,
        channelId,
        channelKind: "WEB",
        profile: "storefront-web",
      },
    });
    await expect(
      service.resolveApplicationRegistration(
        clientId,
        "https://other.example:443",
      ),
    ).resolves.toEqual({ status: "IDENTITY_MISMATCH" });
  });

  it("does not treat readable legacy handles or inactive state as authority", async () => {
    const findApplicationByClientId = jest
      .fn()
      .mockImplementation((handle: string) =>
        Promise.resolve(
          handle === clientId
            ? webApplication({ lifecycle: "DISABLED" })
            : null,
        ),
      );
    const service = new AuthorityService({
      findApplicationByClientId,
    } as unknown as AuthorityRepository);

    await expect(
      service.resolveApplicationRegistration("storefront-web-local"),
    ).resolves.toEqual({ status: "NOT_FOUND" });
    expect(findApplicationByClientId).toHaveBeenCalledWith(
      "storefront-web-local",
    );
    await expect(
      service.resolveApplicationRegistration(
        clientId,
        "https://shop.example:443",
      ),
    ).resolves.toEqual({ status: "INACTIVE" });
  });

  it("distinguishes unknown target from a cross-tenant site", async () => {
    const service = new AuthorityService({
      findTenant: jest.fn().mockResolvedValue({
        id: tenantId,
        lifecycle: "ACTIVE",
        revision: 2n,
      }),
      findSite: jest.fn().mockResolvedValue({
        id: siteId,
        tenantId: otherTenantId,
        lifecycle: "ACTIVE",
        revision: 3n,
      }),
    } as unknown as AuthorityRepository);

    await expect(
      service.validateTargetScope(tenantId, siteId),
    ).resolves.toEqual({ status: "SCOPE_MISMATCH" });
  });

  it("resolves entitlement references only at their exact frozen scope", async () => {
    const service = new AuthorityService({
      findEntitlementScopeRef: jest.fn().mockResolvedValue({
        id: entitlementRef,
        scopeKind: "SITE",
        tenantId,
        siteId,
        revision: 7n,
      }),
    } as unknown as AuthorityRepository);

    await expect(
      service.resolveEntitlementScopeRef(entitlementRef, tenantId, siteId),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      scopeKind: "SITE",
      referenceRevision: "7",
    });
    await expect(
      service.resolveEntitlementScopeRef(entitlementRef, otherTenantId, siteId),
    ).resolves.toEqual({ status: "SCOPE_MISMATCH" });
  });

  it("publishes read-only v1 RPCs behind exact internal caller policy", () => {
    const root = path.resolve(__dirname, "../../..");
    const proto = readFileSync(
      path.join(root, "packages/protos/tenant_authority.proto"),
      "utf8",
    );
    const controller = readFileSync(
      path.join(
        root,
        "apps/tenant-authority-service/src/authority/authority-grpc.controller.ts",
      ),
      "utf8",
    );

    expect(proto).toContain("package tenant_authority.v1;");
    expect(proto.match(/\brpc\s+/g)).toHaveLength(5);
    expect(proto).not.toMatch(/\brpc\s+(?:Create|Update|Delete|Revoke)/);
    expect(controller.match(/@InternalOnly\(\)/g)).toHaveLength(4);
    expect(controller.match(/@AllowedS2SIdentities\(/g)).toHaveLength(5);
    expect(
      controller.match(/@RequireS2SAuthorityResolution\(\)/g),
    ).toHaveLength(1);
    expect(controller.match(/@RequireUserId\(\)/g)).toHaveLength(1);
    expect(controller).not.toMatch(/@(Post|Put|Patch|Delete)\(/);
  });
});
