BEGIN;
CREATE TABLE "OrderCancellation" (
  "orderId" UUID NOT NULL PRIMARY KEY,
  "checkoutAttemptId" UUID NOT NULL,
  "stockHash" CHAR(64) NOT NULL,
  "actorId" UUID NOT NULL,
  "actorRole" TEXT NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "intentHash" CHAR(64) NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderCancellation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderCancellation_checkoutAttemptId_fkey" FOREIGN KEY ("checkoutAttemptId") REFERENCES "CheckoutAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderCancellation_actor_check" CHECK ("actorRole" IN ('admin','root-admin') AND length("requestId") <= 128),
  CONSTRAINT "OrderCancellation_hashes_check" CHECK ("keyHash" ~ '^[0-9a-f]{64}$' AND "intentHash" ~ '^[0-9a-f]{64}$' AND "stockHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "OrderCancellation_version_check" CHECK ("expectedVersion" >= 1 AND "expectedVersion" < 2147483647 AND "failures" >= 0),
  CONSTRAINT "OrderCancellation_lease_check" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL) AND ("completedAt" IS NULL OR "leaseToken" IS NULL))
);
CREATE UNIQUE INDEX "OrderCancellation_checkoutAttemptId_key" ON "OrderCancellation"("checkoutAttemptId");
CREATE UNIQUE INDEX "OrderCancellation_actorId_keyHash_key" ON "OrderCancellation"("actorId","keyHash");
CREATE INDEX "OrderCancellation_completedAt_nextRetryAt_idx" ON "OrderCancellation"("completedAt","nextRetryAt");
COMMIT;
