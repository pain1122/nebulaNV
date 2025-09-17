-- CreateTable
CREATE TABLE "app_settings" (
    "id" UUID NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'core',
    "environment" TEXT NOT NULL DEFAULT 'default',
    "key" TEXT NOT NULL,
    "valueJson" JSONB,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBool" BOOLEAN,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_settings_ns_key" ON "app_settings"("namespace", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ux_settings_ns_env_key" ON "app_settings"("namespace", "environment", "key");
