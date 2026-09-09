import * as bcrypt from "bcryptjs";
import type { PrismaClient } from "../prisma/generated/client";
import { compareF4R3ShadowLogin } from "../src/migration/f4-r3-shadow-login";

describe("F4 R3 shadow login comparison", () => {
  it("matches the legacy result without returning security material", async () => {
    const passwordHash = await bcrypt.hash("CorrectPassword123!", 4);
    const findFirst = jest.fn().mockResolvedValue({
      subject: {
        lifecycle: "PROVISIONING",
        localCredential: { passwordHash },
      },
    });
    const prisma = {
      loginIdentifier: { findFirst },
    } as unknown as Pick<PrismaClient, "loginIdentifier">;
    const result = await compareF4R3ShadowLogin(prisma, {
      kind: "EMAIL",
      identifier: " User@Example.Test ",
      password: "CorrectPassword123!",
      legacyAccepted: true,
    });
    expect(result).toEqual({
      legacyAccepted: true,
      shadowAccepted: true,
      comparison: "MATCH",
    });
    expect(JSON.stringify(findFirst.mock.calls)).toContain(
      '"normalizedValue":"user@example.test"',
    );
    expect(JSON.stringify(result)).not.toMatch(
      /password|subject|session|token/i,
    );
  });

  it("reports disagreement and rejects noncanonical phones without a lookup", async () => {
    const findFirst = jest.fn();
    const prisma = {
      loginIdentifier: { findFirst },
    } as unknown as Pick<PrismaClient, "loginIdentifier">;
    await expect(
      compareF4R3ShadowLogin(prisma, {
        kind: "PHONE",
        identifier: "00989123456789",
        password: "CorrectPassword123!",
        legacyAccepted: true,
      }),
    ).resolves.toEqual({
      legacyAccepted: true,
      shadowAccepted: false,
      comparison: "MISMATCH",
    });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
