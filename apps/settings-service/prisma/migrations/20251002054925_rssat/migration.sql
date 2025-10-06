-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'default',
    "key" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_namespace_env_key_uq" ON "app_settings"("namespace", "environment", "key");
