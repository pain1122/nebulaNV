ALTER TABLE "Product"
ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Product"
ADD CONSTRAINT "Product_stockQuantity_nonnegative" CHECK ("stockQuantity" >= 0),
ADD CONSTRAINT "Product_version_positive" CHECK ("version" >= 1),
ADD CONSTRAINT "Product_untracked_stock_zero" CHECK ("trackInventory" OR "stockQuantity" = 0);
