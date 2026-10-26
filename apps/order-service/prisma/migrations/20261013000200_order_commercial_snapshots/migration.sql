BEGIN;

ALTER TABLE "Order" ADD COLUMN "checkoutMode" TEXT NOT NULL DEFAULT 'DEMO_NO_PAYMENT';
ALTER TABLE "OrderItem"
  ADD COLUMN "variantId" UUID,
  ADD COLUMN "selectedOptions" JSONB NOT NULL DEFAULT '{}';

-- Earlier Orders preserve their original commercial facts; no catalogue lookup.
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutMode_demo_check"
  CHECK ("checkoutMode" = 'DEMO_NO_PAYMENT');
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_selection_snapshot_check"
  CHECK (
    jsonb_typeof("selectedOptions") = 'object' AND
    (("variantId" IS NULL AND "selectedOptions" = '{}'::jsonb) OR
     ("variantId" IS NOT NULL AND "selectedOptions" <> '{}'::jsonb AND
      NOT jsonb_path_exists("selectedOptions", '$.* ? (@.type() != "string" || @ == "")')))
  );

COMMIT;
