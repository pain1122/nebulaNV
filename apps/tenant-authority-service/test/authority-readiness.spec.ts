import { ServiceUnavailableException } from "@nestjs/common";
import { S2SReplayStore } from "@nebula/grpc-auth";
import { AuthorityRepository } from "../src/authority/authority.repository";
import { AuthorityService } from "../src/authority/authority.service";
import { HealthController } from "../src/health.controller";
import { PrismaService } from "../src/prisma.service";

describe("authority readiness", () => {
  it("requires all exact completed authority migrations", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        foundationPresent: true,
        registrationRecordsPresent: true,
        entitlementScopeReferencePresent: true,
        registrationAuditPresent: true,
        membershipFoundationPresent: true,
      },
    ]);
    const repository = new AuthorityRepository({
      $queryRaw: query,
    } as unknown as PrismaService);

    await expect(
      repository.assertRequiredMigrationsReady(),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      foundationPresent: false,
      registrationRecordsPresent: true,
      entitlementScopeReferencePresent: true,
      registrationAuditPresent: true,
      membershipFoundationPresent: true,
    },
    {
      foundationPresent: true,
      registrationRecordsPresent: false,
      entitlementScopeReferencePresent: true,
      registrationAuditPresent: true,
      membershipFoundationPresent: true,
    },
    {
      foundationPresent: true,
      registrationRecordsPresent: true,
      entitlementScopeReferencePresent: false,
      registrationAuditPresent: true,
      membershipFoundationPresent: true,
    },
    {
      foundationPresent: true,
      registrationRecordsPresent: true,
      entitlementScopeReferencePresent: true,
      registrationAuditPresent: false,
      membershipFoundationPresent: true,
    },
    {
      foundationPresent: true,
      registrationRecordsPresent: true,
      entitlementScopeReferencePresent: true,
      registrationAuditPresent: true,
      membershipFoundationPresent: false,
    },
  ])("fails closed when a required migration is absent", async (presence) => {
    const repository = new AuthorityRepository({
      $queryRaw: jest.fn().mockResolvedValue([presence]),
    } as unknown as PrismaService);

    await expect(repository.assertRequiredMigrationsReady()).rejects.toThrow(
      "authority_required_migration_missing",
    );
  });

  it("keeps liveness independent and reports migration readiness", async () => {
    const checkReadiness = jest.fn().mockResolvedValue(undefined);
    const checkReplayReadiness = jest.fn().mockResolvedValue(undefined);
    const controller = new HealthController(
      { checkReadiness } as unknown as AuthorityService,
      { checkReadiness: checkReplayReadiness } as unknown as S2SReplayStore,
    );

    expect(controller.liveness()).toMatchObject({
      status: "ok",
      service: "tenant-authority-service",
    });
    await expect(controller.readinessExplicit()).resolves.toMatchObject({
      status: "ok",
      checks: {
        databaseMigration: { status: "ok" },
        s2sReplay: { status: "ok" },
      },
    });
    expect(checkReplayReadiness).toHaveBeenCalledTimes(1);
  });

  it("returns the standard unavailable response when readiness fails", async () => {
    const controller = new HealthController(
      {
        checkReadiness: jest
          .fn()
          .mockRejectedValue(new Error("database_unavailable")),
      } as unknown as AuthorityService,
      {
        checkReadiness: jest.fn().mockResolvedValue(undefined),
      } as unknown as S2SReplayStore,
    );

    await expect(controller.readinessExplicit()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
