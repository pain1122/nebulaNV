ALTER TABLE "public"."Media"
ADD COLUMN "entityType" TEXT,
ADD COLUMN "entityId" TEXT;

CREATE INDEX "Media_entityType_entityId_idx" ON "public"."Media"("entityType", "entityId");
CREATE INDEX "Media_scope_entityType_entityId_idx" ON "public"."Media"("scope", "entityType", "entityId");
CREATE INDEX "Media_ownerId_scope_entityType_entityId_idx" ON "public"."Media"("ownerId", "scope", "entityType", "entityId");
