-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "AttributeValueType" AS ENUM ('STRING', 'INT', 'BOOL');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "excerpt" TEXT,
    "sku" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "price" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "thumbnailUrl" TEXT,
    "category_id" UUID NOT NULL,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(18,2),
    "discountActive" BOOLEAN NOT NULL DEFAULT false,
    "discountStart" TIMESTAMP(3),
    "discountEnd" TIMESTAMP(3),
    "model3dUrl" TEXT,
    "model3dFormat" TEXT,
    "model3dLiveView" BOOLEAN NOT NULL DEFAULT false,
    "model3dPosterUrl" TEXT,
    "vrPlanImageUrl" TEXT,
    "vrEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "customSchema" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featureSort" INTEGER NOT NULL DEFAULT 0,
    "promoTitle" TEXT,
    "promoBadge" TEXT,
    "promoActive" BOOLEAN NOT NULL DEFAULT false,
    "promoStart" TIMESTAMP(3),
    "promoEnd" TIMESTAMP(3),
    "tags" TEXT[],
    "complementaryIds" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGalleryImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVrHotspot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "panoImageUrl" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "yaw" DOUBLE PRECISION,
    "pitch" DOUBLE PRECISION,
    "fov" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVrHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "AttributeValueType" NOT NULL,
    "valueString" TEXT,
    "valueInt" INTEGER,
    "valueBool" BOOLEAN,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductComment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "rating" INTEGER,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PENDING',
    "parentId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSet" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(18,2),
    "productIds" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_category_slug_key" ON "product_category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_category_id_idx" ON "Product"("category_id");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE INDEX "Product_isFeatured_featureSort_idx" ON "Product"("isFeatured", "featureSort");

-- CreateIndex
CREATE INDEX "ProductGalleryImage_productId_sortOrder_idx" ON "ProductGalleryImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductGalleryImage_deletedAt_idx" ON "ProductGalleryImage"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductVrHotspot_productId_idx" ON "ProductVrHotspot"("productId");

-- CreateIndex
CREATE INDEX "ProductVrHotspot_deletedAt_idx" ON "ProductVrHotspot"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_key_idx" ON "ProductAttribute"("productId", "key");

-- CreateIndex
CREATE INDEX "ProductAttribute_deletedAt_idx" ON "ProductAttribute"("deletedAt");

-- CreateIndex
CREATE INDEX "ProductComment_productId_status_idx" ON "ProductComment"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductComment_deletedAt_idx" ON "ProductComment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSet_slug_key" ON "ProductSet"("slug");

-- CreateIndex
CREATE INDEX "ProductSet_active_idx" ON "ProductSet"("active");

-- CreateIndex
CREATE INDEX "ProductSet_deletedAt_idx" ON "ProductSet"("deletedAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductGalleryImage" ADD CONSTRAINT "ProductGalleryImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVrHotspot" ADD CONSTRAINT "ProductVrHotspot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductComment" ADD CONSTRAINT "ProductComment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
