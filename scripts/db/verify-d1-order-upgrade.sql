SELECT "_d1_upgrade_check_legacy"();
DO $$ BEGIN
  IF (SELECT count(*) FROM "Cart")<>1 OR (SELECT count(*) FROM "Order")<>1 OR (SELECT count(*) FROM "CartItem")<>1 OR (SELECT count(*) FROM "OrderItem")<>1 THEN RAISE EXCEPTION 'd1_upgrade_order_counts'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Cart','Order') AND column_name='currency' AND column_default IS NOT NULL) THEN RAISE EXCEPTION 'd1_upgrade_order_currency_defaults'; END IF;
END $$;
BEGIN;
DO $$ DECLARE failed_column text; BEGIN
  INSERT INTO "Cart" ("id","userId","currency","updatedAt") VALUES ('fd200000-0000-4000-8000-000000000089','fd200000-0000-4000-8000-000000000089','USD',now());
  INSERT INTO "Order" ("id","orderNumber","userId","currency","subtotal","total","updatedAt") VALUES ('fd200000-0000-4000-8000-000000000088','D1-EXPLICIT-CURRENCY','fd200000-0000-4000-8000-000000000088','USD',1,1,now());
  BEGIN
    INSERT INTO "Cart" ("id","userId","updatedAt") VALUES ('fd200000-0000-4000-8000-000000000090','fd200000-0000-4000-8000-000000000091',now());
    RAISE EXCEPTION 'd1_upgrade_missing_cart_currency_accepted';
  EXCEPTION WHEN not_null_violation THEN
    GET STACKED DIAGNOSTICS failed_column = COLUMN_NAME;
    IF failed_column<>'currency' THEN RAISE EXCEPTION 'd1_upgrade_unexpected_missing_column_%',failed_column; END IF;
  END;
  BEGIN
    INSERT INTO "Order" ("id","orderNumber","userId","subtotal","total","updatedAt") VALUES ('fd200000-0000-4000-8000-000000000092','D1-MISSING-CURRENCY','fd200000-0000-4000-8000-000000000091',1,1,now());
    RAISE EXCEPTION 'd1_upgrade_missing_order_currency_accepted';
  EXCEPTION WHEN not_null_violation THEN
    GET STACKED DIAGNOSTICS failed_column = COLUMN_NAME;
    IF failed_column<>'currency' THEN RAISE EXCEPTION 'd1_upgrade_unexpected_missing_column_%',failed_column; END IF;
  END;
END $$;
ROLLBACK;
