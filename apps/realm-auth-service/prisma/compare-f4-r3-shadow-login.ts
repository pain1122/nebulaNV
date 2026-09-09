/* eslint-disable no-console */
import { PrismaClient } from "./generated/client";
import { compareF4R3ShadowLogin } from "../src/migration/f4-r3-shadow-login";

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value?.slice(prefix.length)) {
    throw new Error(`f4_r3_shadow_login_${name}_required`);
  }
  return value.slice(prefix.length);
}

async function main(): Promise<void> {
  if (process.env.REALM_AUTH_DEPLOYMENT !== "DEFAULT") {
    throw new Error("f4_r3_shadow_login_default_deployment_required");
  }
  const kind = argument("kind");
  if (kind !== "EMAIL" && kind !== "PHONE") {
    throw new Error("f4_r3_shadow_login_kind_invalid");
  }
  const password = process.env.F4_R3_SHADOW_LOGIN_PASSWORD;
  if (!password) throw new Error("f4_r3_shadow_login_password_required");
  const legacyAccepted = process.env.F4_R3_LEGACY_ACCEPTED;
  if (legacyAccepted !== "true" && legacyAccepted !== "false") {
    throw new Error("f4_r3_shadow_login_legacy_result_required");
  }
  const prisma = new PrismaClient();
  try {
    const result = await compareF4R3ShadowLogin(prisma, {
      kind,
      identifier: argument("identifier"),
      password,
      legacyAccepted: legacyAccepted === "true",
    });
    console.log(JSON.stringify(result));
    if (result.comparison !== "MATCH") process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`f4_r3_shadow_login_compare_failed:${message}`);
  process.exitCode = 1;
});
