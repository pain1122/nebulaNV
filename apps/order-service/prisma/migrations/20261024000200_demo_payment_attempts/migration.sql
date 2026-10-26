BEGIN;
CREATE TYPE "DemoPaymentState" AS ENUM ('PREPARING','PROCESSING','RESOLVING','SUCCEEDED','FAILED','CANCELLED');
CREATE TABLE "DemoPaymentAttempt" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL,
  "state" "DemoPaymentState" NOT NULL DEFAULT 'PREPARING',
  "stockSource" TEXT NOT NULL,
  "stockIntentId" UUID NOT NULL,
  "stockHash" CHAR(64) NOT NULL,
  "stockFacts" JSONB,
  "abortRequested" BOOLEAN NOT NULL DEFAULT false,
  "leaseToken" UUID,
  "leaseUntil" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failures" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoPaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DemoPaymentAttempt_stock_check" CHECK ("stockHash" ~ '^[0-9a-f]{64}$' AND (
    ("stockSource"='FINALIZED_CHECKOUT' AND "stockFacts" IS NULL AND NOT "abortRequested") OR
    ("stockSource"='RETRY_HOLD' AND "stockFacts" IS NOT NULL AND jsonb_typeof("stockFacts")='object')
  )),
  CONSTRAINT "DemoPaymentAttempt_lease_check" CHECK (("leaseToken" IS NULL) = ("leaseUntil" IS NULL) AND
    ("state" IN ('PREPARING','RESOLVING') OR "leaseToken" IS NULL)),
  CONSTRAINT "DemoPaymentAttempt_failures_check" CHECK ("failures" >= 0)
);
CREATE UNIQUE INDEX "DemoPaymentAttempt_stockIntentId_key" ON "DemoPaymentAttempt"("stockIntentId");
CREATE UNIQUE INDEX "DemoPaymentAttempt_one_active_order" ON "DemoPaymentAttempt"("orderId") WHERE "state" IN ('PREPARING','PROCESSING','RESOLVING');
CREATE INDEX "DemoPaymentAttempt_state_nextRetryAt_idx" ON "DemoPaymentAttempt"("state","nextRetryAt");
CREATE TABLE "DemoPaymentCommand" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "outcome" TEXT,
  "actorId" UUID NOT NULL,
  "actorRole" TEXT NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "intentHash" CHAR(64) NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DemoPaymentCommand_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DemoPaymentCommand_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "DemoPaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DemoPaymentCommand_authority_check" CHECK ((
    ("kind"='START' AND "outcome" IS NULL AND "actorRole"='user') OR
    ("kind"='OUTCOME' AND "outcome" IN ('SUCCEEDED','FAILED','CANCELLED','UNKNOWN') AND "actorRole" IN ('admin','root-admin'))
  ) IS TRUE),
  CONSTRAINT "DemoPaymentCommand_input_check" CHECK ("expectedVersion" >= 1 AND "expectedVersion" < 2147483647 AND length("requestId") <= 128 AND "keyHash" ~ '^[0-9a-f]{64}$' AND "intentHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "DemoPaymentCommand_response_check" CHECK ("response" IS NULL OR (
    jsonb_typeof("response")='object' AND "response"#>>'{order,id}'="orderId"::text AND
    "response"#>>'{attempt,id}'="attemptId"::text AND "response"#>>'{attempt,orderId}'="orderId"::text AND
    "response"#>>'{attempt,mode}'='DEMO' AND
    "response"#>'{order,version}'=to_jsonb("expectedVersion" + CASE WHEN "kind"='OUTCOME' AND "outcome"='UNKNOWN' THEN 0 ELSE 1 END)
  ) IS TRUE)
);
CREATE UNIQUE INDEX "DemoPaymentCommand_actorId_keyHash_key" ON "DemoPaymentCommand"("actorId","keyHash");
CREATE UNIQUE INDEX "DemoPaymentCommand_one_pending_attempt" ON "DemoPaymentCommand"("attemptId") WHERE "response" IS NULL;
CREATE INDEX "DemoPaymentCommand_attemptId_createdAt_idx" ON "DemoPaymentCommand"("attemptId","createdAt");
COMMIT;
