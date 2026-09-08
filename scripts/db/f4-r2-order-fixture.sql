-- Old-schema orders/carts and their child items.
INSERT INTO "Order" (
  "id", "orderNumber", "userId", "status", "subtotal", "total", "meta", "updatedAt"
) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'R2-001', 'd1000000-0000-4000-8000-000000000001',
   'PAID', 12.34, 12.34, '{"fixture":true}', '2026-09-01'),
  ('e2000000-0000-4000-8000-000000000002', 'R2-002', 'd1000000-0000-4000-8000-000000000002',
   'CANCELLED', 56.78, 56.78, '{"fixture":false}', '2026-09-02');
INSERT INTO "Cart" ("id", "userId", "expiresAt", "updatedAt") VALUES
  ('e3000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', '2026-10-01', '2026-09-01'),
  ('e3000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000002', NULL, '2026-09-02');
INSERT INTO "OrderItem" ("id", "orderId", "productId", "name", "quantity", "unitPrice", "lineTotal", "updatedAt")
VALUES ('e4000000-0000-4000-8000-000000000001', 'e2000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001', 'R2 item', 1, 12.34, 12.34, '2026-09-01');
INSERT INTO "CartItem" ("id", "cartId", "productId", "name", "quantity", "unitPrice", "updatedAt")
VALUES ('e4000000-0000-4000-8000-000000000002', 'e3000000-0000-4000-8000-000000000001',
  'e5000000-0000-4000-8000-000000000001', 'R2 item', 1, 12.34, '2026-09-01');

-- Persist the complete old rows across separate psql/seed processes.
CREATE TABLE "_r2_snapshot" ("tableName" text PRIMARY KEY, "rows" jsonb NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['Order', 'Cart', 'OrderItem', 'CartItem'] LOOP
    EXECUTE format(
      'INSERT INTO "_r2_snapshot" SELECT %L, COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t."id"), ''[]''::jsonb) FROM %I t',
      table_name, table_name
    );
  END LOOP;
END $$;
