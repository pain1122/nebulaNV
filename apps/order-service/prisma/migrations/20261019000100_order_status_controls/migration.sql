BEGIN;
ALTER TABLE "Order" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Order" ADD CONSTRAINT "Order_version_check" CHECK ("version" >= 1);
CREATE TABLE "OrderStatusChange" (
  "id" UUID NOT NULL PRIMARY KEY,
  "orderId" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "actorRole" TEXT NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "intentHash" CHAR(64) NOT NULL,
  "previousStatus" "OrderStatus" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "requestId" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusChange_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrderStatusChange_actor_check" CHECK ("actorRole" IN ('admin','root-admin') AND length("requestId") <= 128),
  CONSTRAINT "OrderStatusChange_hashes_check" CHECK ("keyHash" ~ '^[0-9a-f]{64}$' AND "intentHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "OrderStatusChange_transition_check" CHECK ("previousStatus" <> "status" AND "expectedVersion" >= 1 AND "expectedVersion" < 2147483647 AND "version" = "expectedVersion" + 1),
  CONSTRAINT "OrderStatusChange_response_check" CHECK ((
    jsonb_typeof("response") = 'object' AND
    "response" ?& ARRAY['id','status','version'] AND
    "response"->>'id' = "orderId"::text AND
    "response"->>'status' = "status"::text AND
    "response"->'version' = to_jsonb("version")
  ) IS TRUE)
);
CREATE UNIQUE INDEX "OrderStatusChange_actorId_keyHash_key" ON "OrderStatusChange"("actorId","keyHash");
CREATE UNIQUE INDEX "OrderStatusChange_orderId_version_key" ON "OrderStatusChange"("orderId","version");
COMMIT;
