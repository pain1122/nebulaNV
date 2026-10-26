BEGIN;
CREATE TYPE "CheckoutAttemptState" AS ENUM ('PREPARED', 'ORDER_COMMITTED', 'COMPLETED', 'CANCELLING', 'CANCELLED');
CREATE TABLE "CheckoutAttempt" (
  "id" UUID NOT NULL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "intentHash" CHAR(64) NOT NULL,
  "stockHash" CHAR(64) NOT NULL,
  "cartId" UUID NOT NULL,
  "cartFingerprint" CHAR(64) NOT NULL,
  "state" "CheckoutAttemptState" NOT NULL DEFAULT 'PREPARED',
  "payload" JSONB,
  "orderId" UUID,
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutAttempt_hashes_check" CHECK (
    "keyHash" ~ '^[0-9a-f]{64}$' AND "intentHash" ~ '^[0-9a-f]{64}$' AND
    "stockHash" ~ '^[0-9a-f]{64}$' AND "cartFingerprint" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "CheckoutAttempt_failures_check" CHECK ("failures" >= 0),
  CONSTRAINT "CheckoutAttempt_lease_check" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL)),
  CONSTRAINT "CheckoutAttempt_state_check" CHECK (
    ("state" IN ('PREPARED','CANCELLING') AND "orderId" IS NULL AND "payload" IS NOT NULL AND jsonb_typeof("payload")='object') OR
    ("state"='ORDER_COMMITTED' AND "orderId" IS NOT NULL AND "orderId"="id" AND "payload" IS NOT NULL AND jsonb_typeof("payload")='object') OR
    ("state"='COMPLETED' AND "orderId" IS NOT NULL AND "orderId"="id" AND "payload" IS NULL AND "leaseToken" IS NULL) OR
    ("state"='CANCELLED' AND "orderId" IS NULL AND "payload" IS NULL AND "leaseToken" IS NULL)
  ),
  CONSTRAINT "CheckoutAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CheckoutAttempt_userId_keyHash_key" ON "CheckoutAttempt"("userId","keyHash");
CREATE UNIQUE INDEX "CheckoutAttempt_orderId_key" ON "CheckoutAttempt"("orderId");
CREATE UNIQUE INDEX "CheckoutAttempt_one_active_owner" ON "CheckoutAttempt"("userId") WHERE "state" IN ('PREPARED','ORDER_COMMITTED','CANCELLING');
CREATE INDEX "CheckoutAttempt_state_nextRetryAt_idx" ON "CheckoutAttempt"("state","nextRetryAt");
COMMIT;
