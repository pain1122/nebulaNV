/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import { PrismaClient } from "./generated/client";
import {
  rollbackStagedOperator,
  stageOperatorRecoveryCredential,
  verifyOperatorRecoveryCredential,
} from "../src/migration/r4-operator-staging";

function passwordFromStdin(): string {
  const input = readFileSync(0, "utf8");
  if (input.endsWith("\r\n")) return input.slice(0, -2);
  if (input.endsWith("\n")) return input.slice(0, -1);
  return input;
}

function bcryptRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS ?? "10";
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("r4_operator_staging_bcrypt_rounds_invalid");
  }
  return Number(raw);
}

async function main(): Promise<void> {
  if (process.env.REALM_AUTH_DEPLOYMENT !== "OPERATOR") {
    throw new Error("r4_operator_staging_operator_deployment_required");
  }
  const operation = process.argv[2];
  const clients = Array.from(
    { length: operation === "stage-concurrent" ? 2 : 1 },
    () => new PrismaClient(),
  );
  const prisma = clients[0];
  try {
    if (operation === "stage") {
      const status = await stageOperatorRecoveryCredential(prisma, {
        password: passwordFromStdin(),
        bcryptRounds: bcryptRounds(),
      });
      console.log(JSON.stringify({ status }));
      return;
    }
    if (operation === "stage-concurrent") {
      const password = passwordFromStdin();
      const rounds = bcryptRounds();
      const statuses = await Promise.all(
        clients.map((client) =>
          stageOperatorRecoveryCredential(client, {
            password,
            bcryptRounds: rounds,
          }),
        ),
      );
      console.log(
        JSON.stringify({
          status: "CONCURRENTLY_STAGED",
          stageStatuses: statuses.sort(),
        }),
      );
      return;
    }
    if (operation === "verify") {
      await verifyOperatorRecoveryCredential(prisma, passwordFromStdin());
      console.log(JSON.stringify({ status: "RECOVERY_READY" }));
      return;
    }
    if (operation === "rollback") {
      const status = await rollbackStagedOperator(prisma);
      console.log(JSON.stringify({ status }));
      return;
    }
    throw new Error("r4_operator_staging_operation_invalid");
  } finally {
    await Promise.all(clients.map((client) => client.$disconnect()));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown_error";
  console.error(`r4_operator_staging_failed:${message}`);
  process.exitCode = 1;
});
