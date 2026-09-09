import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../prisma/generated/client";
import {
  expectedShadowBoundary,
  seedShadowBoundary,
} from "../src/migration/shadow-boundary.seed";

function mockPrisma(
  boundaries: unknown[],
  keys: unknown[],
): { prisma: PrismaClient; tx: Record<string, unknown> } {
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    realmBoundary: {
      findMany: jest.fn().mockResolvedValue(boundaries),
      create: jest.fn().mockResolvedValue(undefined),
    },
    realmKeyRegistration: {
      findMany: jest.fn().mockResolvedValue(keys),
      createMany: jest.fn().mockResolvedValue({ count: 6 }),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as PrismaClient;
  return { prisma, tx };
}

describe("shadow boundary seed", () => {
  it.each(["DEFAULT", "OPERATOR"] as const)(
    "creates the exact %s boundary and six purpose-separated key references",
    async (name) => {
      const { prisma, tx } = mockPrisma([], []);
      await expect(seedShadowBoundary(prisma, name)).resolves.toBe("CREATED");
      expect(tx.realmBoundary).toHaveProperty("create");
      expect(
        (tx.realmBoundary as { create: jest.Mock }).create,
      ).toHaveBeenCalledWith({ data: expectedShadowBoundary(name).boundary });
      expect(
        (tx.realmKeyRegistration as { createMany: jest.Mock }).createMany,
      ).toHaveBeenCalledWith({ data: expectedShadowBoundary(name).keys });
      expect(expectedShadowBoundary(name).keys).toHaveLength(6);
    },
  );

  it("accepts an exact rerun without writes", async () => {
    const expected = expectedShadowBoundary("DEFAULT");
    const keys = expected.keys.map((key) => ({ ...key, retiredAt: null }));
    const { prisma, tx } = mockPrisma([expected.boundary], keys);
    await expect(seedShadowBoundary(prisma, "DEFAULT")).resolves.toBe(
      "ALREADY_CURRENT",
    );
    expect(
      (tx.realmBoundary as { create: jest.Mock }).create,
    ).not.toHaveBeenCalled();
  });

  it("rejects partial, crossed, and contradictory state", async () => {
    const expected = expectedShadowBoundary("DEFAULT");
    const cases: [unknown[], unknown[]][] = [
      [[], [{ ...expected.keys[0], retiredAt: null }]],
      [[expected.boundary], []],
      [
        [{ ...expected.boundary, identityRealmId: randomUUID() }],
        expected.keys,
      ],
      [[expected.boundary], expected.keys.slice(0, 5)],
    ];
    for (const [boundaries, keys] of cases) {
      const { prisma } = mockPrisma(boundaries, keys);
      await expect(seedShadowBoundary(prisma, "DEFAULT")).rejects.toThrow(
        "realm_auth_shadow_boundary_conflict",
      );
    }
  });
});
