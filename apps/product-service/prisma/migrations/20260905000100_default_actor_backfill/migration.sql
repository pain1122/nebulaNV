-- F4 Batch 3R R2: additive default-realm product-comment actor coordinate.
-- Anonymous comments stay null and legacy userId remains the primary reader.

BEGIN;

ALTER TABLE "ProductComment"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID,
  ADD CONSTRAINT "ProductComment_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "userId" IS NOT NULL
      AND "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" =
        'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId"::text = "userId"
    )
  );

CREATE INDEX "ProductComment_identityRealmId_subjectId_idx"
  ON "ProductComment"("identityRealmId", "subjectId");

CREATE FUNCTION "product_comment_default_actor_pair_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."userId" IS NULL THEN
    IF NEW."identityRealmId" IS NOT NULL OR NEW."subjectId" IS NOT NULL THEN
      RAISE EXCEPTION 'product_comment_actor_pair_without_user';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."userId" !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION 'product_comment_legacy_user_id_invalid';
  END IF;

  IF NEW."identityRealmId" IS NULL AND NEW."subjectId" IS NULL THEN
    NEW."identityRealmId" :=
      'b1000000-0000-4000-8000-000000000001'::uuid;
    NEW."subjectId" := NEW."userId"::uuid;
  ELSIF NEW."identityRealmId" IS NULL OR NEW."subjectId" IS NULL THEN
    RAISE EXCEPTION 'product_comment_default_actor_pair_partial';
  ELSIF NEW."identityRealmId" <>
      'b1000000-0000-4000-8000-000000000001'::uuid
    OR NEW."subjectId"::text <> NEW."userId"
  THEN
    RAISE EXCEPTION 'product_comment_default_actor_pair_mismatch';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "ProductComment_default_actor_pair_guard"
BEFORE INSERT OR UPDATE OF "userId", "identityRealmId", "subjectId"
ON "ProductComment"
FOR EACH ROW EXECUTE FUNCTION "product_comment_default_actor_pair_guard"();

UPDATE "ProductComment"
SET "userId" = "userId"
WHERE "userId" IS NOT NULL
  AND "identityRealmId" IS NULL
  AND "subjectId" IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProductComment"
    WHERE "userId" IS NOT NULL
      AND ("identityRealmId" IS NULL OR "subjectId" IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM "ProductComment"
    WHERE "userId" IS NULL
      AND ("identityRealmId" IS NOT NULL OR "subjectId" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'product_comment_default_actor_backfill_incomplete';
  END IF;
END
$block$;

COMMIT;
