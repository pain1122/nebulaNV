import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(__dirname, "../../..");
const defaultRealmId = "b1000000-0000-4000-8000-000000000001";

const ownerMigrations = [
  ["tenant-authority-service", "authority_default_actor_pair_guard"],
  ["media-service", "media_default_actor_pair_guard"],
  ["order-service", "order_default_actor_pair_guard"],
  ["product-service", "product_comment_default_actor_pair_guard"],
] as const;

function migration(service: string): string {
  return readFileSync(
    path.join(
      repositoryRoot,
      "apps",
      service,
      "prisma",
      "migrations",
      "20260905000100_default_actor_backfill",
      "migration.sql",
    ),
    "utf8",
  );
}

function sourceTree(service: string): string {
  const root = path.join(repositoryRoot, "apps", service, "src");
  const visit = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(entryPath);
      return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
    });
  return visit(root)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

describe("R2 default actor migrations", () => {
  it.each(ownerMigrations)(
    "%s is atomic, deterministic, guarded, and conditionally backfilled",
    (service, guard) => {
      const sql = migration(service);
      expect(sql).toMatch(/^--[\s\S]*\nBEGIN;/);
      expect(sql.trimEnd()).toMatch(/COMMIT;$/);
      expect(sql).toContain(defaultRealmId);
      expect(sql).toContain(guard);
      expect(sql).toMatch(
        /"identityRealmId" IS NULL[\s\S]*"subjectId" IS NULL/,
      );
      expect(sql).toMatch(/UPDATE [\s\S]* WHERE |UPDATE [\s\S]*\nWHERE /);
    },
  );

  it("keeps legacy Authority identity and v1 history while adding v2 evidence", () => {
    const schema = readFileSync(
      path.join(
        repositoryRoot,
        "apps/tenant-authority-service/prisma/schema.prisma",
      ),
      "utf8",
    );
    const sql = migration("tenant-authority-service");

    expect(schema).toMatch(
      /model Membership \{[\s\S]*userId[\s\S]*identityRealmId[\s\S]*subjectId/,
    );
    expect(schema).toMatch(/model MembershipEpoch \{[\s\S]*membershipEpochRef/);
    expect(sql).toContain('"eventVersion" = 1');
    expect(sql).toContain('"payloadVersion" = 1');
    expect(sql).not.toMatch(/UPDATE "AuthorityAuditEvent"/);
    expect(sql).not.toMatch(/UPDATE "AuthorityInvalidationOutbox"/);
    expect(sql).not.toMatch(/DROP (?:COLUMN|TABLE)/);
  });

  it("leaves domain runtime on its legacy actor readers for this gate", () => {
    for (const service of [
      "media-service",
      "order-service",
      "product-service",
    ]) {
      const runtime = sourceTree(service);
      expect(runtime).not.toMatch(/identityRealmId|subjectId/);
    }
  });
});
