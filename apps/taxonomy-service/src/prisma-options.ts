import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "./generated/prisma/client";

function integerParameter(
  url: URL,
  name: string,
  fallback: number,
  minimum: number,
) {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 2_147_483
  ) {
    throw new Error(`taxonomy_database_${name}_invalid`);
  }
  return value;
}

export function taxonomyPrismaOptions(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("taxonomy_database_url_required");
  let url: URL;
  try {
    url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new Error("taxonomy_database_url_invalid");
  }
  const schema = url.searchParams.get("schema") ?? "public";
  if (!schema) throw new Error("taxonomy_database_schema_invalid");

  return {
    adapter: new PrismaPg(
      {
        connectionString: databaseUrl,
        max: integerParameter(url, "connection_limit", 10, 1),
        connectionTimeoutMillis:
          integerParameter(url, "connect_timeout", 5, 0) * 1000,
      },
      { schema },
    ),
    log: [{ emit: "event" as const, level: "error" as const }],
  } satisfies Prisma.PrismaClientOptions;
}
