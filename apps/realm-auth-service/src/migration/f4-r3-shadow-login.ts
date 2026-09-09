import * as bcrypt from "bcryptjs";
import type { PrismaClient } from "../../prisma/generated/client";
import { REALM_AUTH_DEPLOYMENTS } from "../config/realm-deployments";

export type F4R3ShadowLoginInput = Readonly<{
  kind: "EMAIL" | "PHONE";
  identifier: string;
  password: string;
  legacyAccepted: boolean;
}>;

export type F4R3ShadowLoginResult = Readonly<{
  legacyAccepted: boolean;
  shadowAccepted: boolean;
  comparison: "MATCH" | "MISMATCH";
}>;

type ShadowLoginReader = Pick<PrismaClient, "loginIdentifier">;

function normalize(input: F4R3ShadowLoginInput): string | null {
  if (input.kind === "EMAIL") {
    const value = input.identifier.trim().toLowerCase();
    return value && value.length <= 512 ? value : null;
  }
  return /^\+[1-9][0-9]{1,14}$/.test(input.identifier)
    ? input.identifier
    : null;
}

// Migration-only comparison. It returns no subject, hash, session, token, or
// generation and performs no write. Current User/Auth remains authoritative.
export async function compareF4R3ShadowLogin(
  prisma: ShadowLoginReader,
  input: F4R3ShadowLoginInput,
): Promise<F4R3ShadowLoginResult> {
  const normalizedValue = normalize(input);
  let shadowAccepted = false;
  if (normalizedValue !== null && input.password.length > 0) {
    const identifier = await prisma.loginIdentifier.findFirst({
      where: {
        identityRealmId: REALM_AUTH_DEPLOYMENTS.DEFAULT.identityRealmId,
        kind: input.kind,
        normalizedValue,
        state: "ACTIVE",
      },
      select: {
        subject: {
          select: {
            lifecycle: true,
            localCredential: { select: { passwordHash: true } },
          },
        },
      },
    });
    if (
      identifier?.subject.lifecycle === "PROVISIONING" &&
      identifier.subject.localCredential !== null
    ) {
      shadowAccepted = await bcrypt.compare(
        input.password,
        identifier.subject.localCredential.passwordHash,
      );
    }
  }
  return {
    legacyAccepted: input.legacyAccepted,
    shadowAccepted,
    comparison: shadowAccepted === input.legacyAccepted ? "MATCH" : "MISMATCH",
  };
}
