BEGIN;
CREATE TABLE "CheckoutReceipt" (
  id UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "intentHash" CHAR(64) NOT NULL,
  "cartFingerprint" CHAR(64) NOT NULL,
  "orderId" UUID NOT NULL,
  response JSONB,
  "replayUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckoutReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CheckoutReceipt_hashes_check" CHECK ("keyHash" ~ '^[a-f0-9]{64}$' AND "intentHash" ~ '^[a-f0-9]{64}$' AND "cartFingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "CheckoutReceipt_replay_window_check" CHECK ("replayUntil" = "createdAt" + INTERVAL '7 days'),
  CONSTRAINT "CheckoutReceipt_response_check" CHECK (response IS NULL OR jsonb_typeof(response) = 'object')
);
CREATE UNIQUE INDEX "CheckoutReceipt_userId_keyHash_key" ON "CheckoutReceipt"("userId","keyHash");
CREATE UNIQUE INDEX "CheckoutReceipt_orderId_key" ON "CheckoutReceipt"("orderId");
CREATE INDEX "CheckoutReceipt_replayUntil_idx" ON "CheckoutReceipt"("replayUntil");
COMMIT;
