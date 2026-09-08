-- F4 Batch 3R R2: additive default-realm order/cart actor coordinates.
-- Legacy userId readers/writers remain primary in this gate.

BEGIN;

ALTER TABLE "Order"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID,
  ADD CONSTRAINT "Order_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" =
        'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" = "userId"
    )
  );

ALTER TABLE "Cart"
  ADD COLUMN "identityRealmId" UUID,
  ADD COLUMN "subjectId" UUID,
  ADD CONSTRAINT "Cart_actor_pair_check" CHECK (
    ("identityRealmId" IS NULL AND "subjectId" IS NULL)
    OR (
      "identityRealmId" IS NOT NULL AND "subjectId" IS NOT NULL
      AND "identityRealmId" =
        'b1000000-0000-4000-8000-000000000001'::uuid
      AND "subjectId" = "userId"
    )
  );

CREATE INDEX "Order_identityRealmId_subjectId_idx"
  ON "Order"("identityRealmId", "subjectId");
CREATE INDEX "Cart_identityRealmId_subjectId_idx"
  ON "Cart"("identityRealmId", "subjectId");

CREATE FUNCTION "order_default_actor_pair_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."identityRealmId" IS NULL AND NEW."subjectId" IS NULL THEN
    NEW."identityRealmId" :=
      'b1000000-0000-4000-8000-000000000001'::uuid;
    NEW."subjectId" := NEW."userId";
  ELSIF NEW."identityRealmId" IS NULL OR NEW."subjectId" IS NULL THEN
    RAISE EXCEPTION 'order_default_actor_pair_partial';
  ELSIF NEW."identityRealmId" <>
      'b1000000-0000-4000-8000-000000000001'::uuid
    OR NEW."subjectId" <> NEW."userId"
  THEN
    RAISE EXCEPTION 'order_default_actor_pair_mismatch';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER "Order_default_actor_pair_guard"
BEFORE INSERT OR UPDATE OF "userId", "identityRealmId", "subjectId"
ON "Order"
FOR EACH ROW EXECUTE FUNCTION "order_default_actor_pair_guard"();
CREATE TRIGGER "Cart_default_actor_pair_guard"
BEFORE INSERT OR UPDATE OF "userId", "identityRealmId", "subjectId"
ON "Cart"
FOR EACH ROW EXECUTE FUNCTION "order_default_actor_pair_guard"();

UPDATE "Order"
SET "userId" = "userId"
WHERE "identityRealmId" IS NULL AND "subjectId" IS NULL;
UPDATE "Cart"
SET "userId" = "userId"
WHERE "identityRealmId" IS NULL AND "subjectId" IS NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Order"
    WHERE "identityRealmId" IS NULL OR "subjectId" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "Cart"
    WHERE "identityRealmId" IS NULL OR "subjectId" IS NULL
  ) THEN
    RAISE EXCEPTION 'order_default_actor_backfill_incomplete';
  END IF;
END
$block$;

COMMIT;
