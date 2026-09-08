-- F4 Batch 3R R2: additive default-realm owner coordinate.
-- The legacy ownerId remains the only runtime reader/writer in this gate.

BEGIN;

ALTER TABLE "Media"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID,
  ADD CONSTRAINT "Media_owner_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "ownerId" IS NOT NULL
      AND "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" =
        'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" = "ownerId"
    )
  );

CREATE INDEX "Media_identityRealmId_subjectId_idx"
  ON "Media"("identityRealmId", "subjectId");

CREATE FUNCTION "media_default_actor_pair_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."ownerId" IS NULL THEN
    IF NEW."identityRealmId" IS NOT NULL OR NEW."subjectId" IS NOT NULL THEN
      RAISE EXCEPTION 'media_default_actor_pair_without_owner';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."identityRealmId" IS NULL AND NEW."subjectId" IS NULL THEN
    NEW."identityRealmId" :=
      'b1000000-0000-4000-8000-000000000001'::uuid;
    NEW."subjectId" := NEW."ownerId";
  ELSIF NEW."identityRealmId" IS NULL OR NEW."subjectId" IS NULL THEN
    RAISE EXCEPTION 'media_default_actor_pair_partial';
  ELSIF NEW."identityRealmId" <>
      'b1000000-0000-4000-8000-000000000001'::uuid
    OR NEW."subjectId" <> NEW."ownerId"
  THEN
    RAISE EXCEPTION 'media_default_actor_pair_mismatch';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "Media_default_actor_pair_guard"
BEFORE INSERT OR UPDATE OF "ownerId", "identityRealmId", "subjectId"
ON "Media"
FOR EACH ROW EXECUTE FUNCTION "media_default_actor_pair_guard"();

UPDATE "Media"
SET "ownerId" = "ownerId"
WHERE "ownerId" IS NOT NULL
  AND "identityRealmId" IS NULL
  AND "subjectId" IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Media"
    WHERE "ownerId" IS NOT NULL
      AND ("identityRealmId" IS NULL OR "subjectId" IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM "Media"
    WHERE "ownerId" IS NULL
      AND ("identityRealmId" IS NOT NULL OR "subjectId" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'media_default_actor_backfill_incomplete';
  END IF;
END
$block$;

COMMIT;
