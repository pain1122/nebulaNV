import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";
import type { ResolveActorAuthorizationInput } from "../src/authority/authority-read.types";

const actorUserId = "10000000-0000-4000-8000-000000000001";
const targetTenantId = "20000000-0000-4000-8000-000000000001";
const parentTenantId = "20000000-0000-4000-8000-000000000002";
const siblingTenantId = "20000000-0000-4000-8000-000000000003";
const targetSiteId = "30000000-0000-4000-8000-000000000001";
const otherSiteId = "30000000-0000-4000-8000-000000000002";
const applicationId = "40000000-0000-4000-8000-000000000001";
const membershipId = "50000000-0000-4000-8000-000000000001";
const epochId = "60000000-0000-4000-8000-000000000001";
const relationshipId = "70000000-0000-4000-8000-000000000001";

function activeTenant(id = targetTenantId) {
  return { id, lifecycle: "ACTIVE", revision: 3n };
}

function activeSite(id = targetSiteId, tenantId = targetTenantId) {
  return { id, tenantId, lifecycle: "ACTIVE", revision: 5n };
}

function activeApplication() {
  return {
    id: applicationId,
    tenantId: targetTenantId,
    siteId: targetSiteId,
    lifecycle: "ACTIVE",
    revision: 7n,
    channel: {
      tenantId: targetTenantId,
      siteId: targetSiteId,
      site: {
        ...activeSite(),
        tenant: activeTenant(),
      },
    },
  };
}

function membership(
  overrides: {
    tenantId?: string;
    state?: string;
    closedAt?: Date | null;
    tenantRole?: "TENANT_ADMIN" | "PARENT_MANAGER";
    siteRole?: "SITE_ADMIN" | "EDITOR" | "USER";
  } = {},
) {
  const tenantId = overrides.tenantId ?? targetTenantId;
  return {
    id: membershipId,
    tenantId,
    userId: actorUserId,
    state: overrides.state ?? "ACTIVE",
    currentEpochId: epochId,
    revision: 11n,
    tenant: activeTenant(tenantId),
    currentEpoch: {
      id: epochId,
      membershipId,
      membershipEpochRef: "meg1_abcdefghijklmnopqrstuvwxyz123456789012345",
      closedAt: overrides.closedAt ?? null,
      tenantRoleGrants: overrides.tenantRole
        ? [
            {
              id: "80000000-0000-4000-8000-000000000001",
              role: overrides.tenantRole,
              state: "ACTIVE",
            },
          ]
        : [],
      siteRoleGrants: overrides.siteRole
        ? [
            {
              id: "90000000-0000-4000-8000-000000000001",
              tenantId: targetTenantId,
              siteId: targetSiteId,
              role: overrides.siteRole,
              state: "ACTIVE",
            },
          ]
        : [],
    },
  };
}

function repository(
  overrides: Partial<Record<keyof AuthorityRepository, jest.Mock>> = {},
) {
  return {
    findTenant: jest.fn().mockResolvedValue(activeTenant()),
    findSite: jest.fn().mockResolvedValue(activeSite()),
    findApplicationById: jest.fn().mockResolvedValue(activeApplication()),
    findActorMembership: jest
      .fn()
      .mockResolvedValue(membership({ siteRole: "EDITOR" })),
    findActivePlatformGrants: jest.fn().mockResolvedValue([]),
    findCurrentParentRelationship: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as AuthorityRepository;
}

function applicationInput(
  overrides: Partial<ResolveActorAuthorizationInput> = {},
): ResolveActorAuthorizationInput {
  return {
    actorUserId,
    targetTenantId,
    targetSiteId,
    applicationId,
    authorizationPath: "APPLICATION",
    normalizedOperation: "PRODUCT.UPDATE",
    ...overrides,
  };
}

describe("target-based actor authority resolution", () => {
  it("resolves one exact application/site grant without role hierarchy", async () => {
    const authority = new AuthorityService(repository());

    const result =
      await authority.resolveActorAuthorization(applicationInput());
    expect(result).toMatchObject({
      status: "RESOLVED",
      decision: {
        actorUserId,
        authorizationPath: "APPLICATION",
        normalizedOperation: "PRODUCT.UPDATE",
        targetTenantId,
        targetSiteId,
        actorAuthority: {
          kind: "MEMBERSHIP",
          actorTenantId: targetTenantId,
          membershipId,
          effectiveRole: "EDITOR",
          siteId: targetSiteId,
        },
      },
    });
    expect(result.decision?.authorityRevision).toMatch(
      /^ar1_[A-Za-z0-9_-]{43}$/,
    );
    expect(typeof result.decision?.resolvedAtMs).toBe("number");

    const userAuthority = new AuthorityService(
      repository({
        findActorMembership: jest
          .fn()
          .mockResolvedValue(membership({ siteRole: "USER" })),
      }),
    );
    await expect(
      userAuthority.resolveActorAuthorization(applicationInput()),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      decision: { actorAuthority: { effectiveRole: "USER" } },
    });
  });

  it("binds the opaque revision to the normalized operation", async () => {
    const authority = new AuthorityService(repository());
    const first = await authority.resolveActorAuthorization(applicationInput());
    const second = await authority.resolveActorAuthorization(
      applicationInput({ normalizedOperation: "PRODUCT.PUBLISH" }),
    );

    expect(first.status).toBe("RESOLVED");
    expect(second.status).toBe("RESOLVED");
    expect(first.decision?.authorityRevision).not.toBe(
      second.decision?.authorityRevision,
    );
  });

  it("denies missing, suspended, closed, and contradictory memberships", async () => {
    const cases = [
      [null, "DENIED"],
      [membership({ state: "SUSPENDED", siteRole: "EDITOR" }), "INACTIVE"],
      [membership({ closedAt: new Date(), siteRole: "EDITOR" }), "INACTIVE"],
      [
        {
          ...membership({ siteRole: "EDITOR" }),
          currentEpochId: "60000000-0000-4000-8000-000000000002",
        },
        "CONTRADICTORY",
      ],
    ] as const;

    for (const [value, status] of cases) {
      const authority = new AuthorityService(
        repository({
          findActorMembership: jest.fn().mockResolvedValue(value),
        }),
      );
      await expect(
        authority.resolveActorAuthorization(applicationInput()),
      ).resolves.toEqual({ status });
    }
  });

  it("rejects wrong-site and application/target disagreement", async () => {
    const wrongSite = new AuthorityService(
      repository({
        findSite: jest
          .fn()
          .mockResolvedValue(activeSite(otherSiteId, siblingTenantId)),
      }),
    );
    await expect(
      wrongSite.resolveActorAuthorization(
        applicationInput({ targetSiteId: otherSiteId }),
      ),
    ).resolves.toEqual({ status: "SCOPE_MISMATCH" });

    const wrongApplication = new AuthorityService(
      repository({
        findApplicationById: jest.fn().mockResolvedValue({
          ...activeApplication(),
          siteId: otherSiteId,
          channel: {
            tenantId: targetTenantId,
            siteId: otherSiteId,
            site: {
              ...activeSite(otherSiteId),
              tenant: activeTenant(),
            },
          },
        }),
      }),
    );
    await expect(
      wrongApplication.resolveActorAuthorization(applicationInput()),
    ).resolves.toEqual({ status: "SCOPE_MISMATCH" });
  });

  it("requires the exact tenant-management role", async () => {
    const input = applicationInput({
      applicationId: undefined,
      targetSiteId: undefined,
      authorizationPath: "TENANT_MANAGEMENT",
      normalizedOperation: "TENANT.UPDATE",
    });
    const tenantAdmin = new AuthorityService(
      repository({
        findActorMembership: jest
          .fn()
          .mockResolvedValue(membership({ tenantRole: "TENANT_ADMIN" })),
      }),
    );
    await expect(
      tenantAdmin.resolveActorAuthorization(input),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      decision: { actorAuthority: { effectiveRole: "TENANT_ADMIN" } },
    });

    const parentManager = new AuthorityService(
      repository({
        findActorMembership: jest
          .fn()
          .mockResolvedValue(membership({ tenantRole: "PARENT_MANAGER" })),
      }),
    );
    await expect(
      parentManager.resolveActorAuthorization(input),
    ).resolves.toEqual({ status: "DENIED" });
  });

  it("allows a parent manager only through one active direct edge", async () => {
    const input = applicationInput({
      actorTenantId: parentTenantId,
      applicationId: undefined,
      authorizationPath: "PARENT_MANAGEMENT",
      normalizedOperation: "MEMBERSHIP.UPDATE",
    });
    const relationship = {
      id: relationshipId,
      parentTenantId,
      subordinateTenantId: targetTenantId,
      state: "ACTIVE",
      revision: 13n,
    };
    const direct = new AuthorityService(
      repository({
        findActorMembership: jest.fn().mockResolvedValue(
          membership({
            tenantId: parentTenantId,
            tenantRole: "PARENT_MANAGER",
          }),
        ),
        findCurrentParentRelationship: jest
          .fn()
          .mockResolvedValue(relationship),
      }),
    );
    await expect(
      direct.resolveActorAuthorization(input),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      decision: {
        relationshipId,
        actorAuthority: {
          actorTenantId: parentTenantId,
          effectiveRole: "PARENT_MANAGER",
        },
      },
    });

    const noDirectEdge = new AuthorityService(
      repository({
        findActorMembership: jest.fn().mockResolvedValue(
          membership({
            tenantId: parentTenantId,
            tenantRole: "PARENT_MANAGER",
          }),
        ),
        findCurrentParentRelationship: jest.fn().mockResolvedValue(null),
      }),
    );
    await expect(
      noDirectEdge.resolveActorAuthorization(input),
    ).resolves.toEqual({ status: "DENIED" });
  });

  it("resolves platform authority only on its explicit path and target", async () => {
    const platform = new AuthorityService(
      repository({
        findActivePlatformGrants: jest.fn().mockResolvedValue([
          {
            id: "a0000000-0000-4000-8000-000000000001",
            role: "PLATFORM_ADMIN",
            state: "ACTIVE",
            revision: 2n,
          },
        ]),
      }),
    );
    await expect(
      platform.resolveActorAuthorization(
        applicationInput({
          applicationId: undefined,
          targetSiteId: undefined,
          authorizationPath: "PLATFORM_MANAGEMENT",
          normalizedOperation: "TENANT.RECOVER",
        }),
      ),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      decision: {
        targetTenantId,
        actorAuthority: { effectiveRole: "PLATFORM_ADMIN" },
      },
    });

    await expect(
      platform.resolveActorAuthorization(applicationInput()),
    ).resolves.toMatchObject({
      status: "RESOLVED",
      decision: { actorAuthority: { effectiveRole: "EDITOR" } },
    });
  });

  it("does not manufacture human authority for service operations", async () => {
    const authority = new AuthorityService(repository());
    await expect(
      authority.resolveActorAuthorization(
        applicationInput({
          applicationId: undefined,
          targetSiteId: undefined,
          authorizationPath: "SERVICE_OPERATION",
          normalizedOperation: "SEARCH.REINDEX",
        }),
      ),
    ).resolves.toEqual({ status: "DENIED" });
  });
});
