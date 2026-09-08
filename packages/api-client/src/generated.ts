// Generated from apps/gateway/openapi/nebula-v1.openapi.json.
// Run `pnpm --filter @nebula/api-client generate`; do not edit by hand.

export type GatewayAdminProductListQueryDto = Readonly<{
  readonly "categoryId"?: string;
  readonly "includeDeleted"?: boolean;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
  readonly "status"?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}>;

export type GatewayAuthLoginRequestDto = Readonly<{
  readonly "identifier": string;
  readonly "password": string;
}>;

export type GatewayAuthLogoutRequestDto = Readonly<{
  readonly "allDevices"?: boolean;
  readonly "refreshToken"?: string;
}>;

export type GatewayAuthLogoutResultDto = Readonly<{
  readonly "success": boolean;
}>;

export type GatewayAuthRefreshRequestDto = Readonly<{
  readonly "refreshToken"?: string;
}>;

export type GatewayAuthRegisterRequestDto = Readonly<{
  readonly "email": string;
  readonly "password": string;
}>;

export type GatewayAuthTokenDto = Readonly<{
  readonly "accessExpiresInSeconds": number;
  readonly "accessToken": string;
  readonly "refreshExpiresInSeconds": number;
  readonly "refreshToken"?: string;
}>;

export type GatewayBlogDeleteResultDto = Readonly<{
  readonly "success": boolean;
}>;

export type GatewayBlogListQueryDto = Readonly<{
  readonly "category"?: string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
  readonly "tag"?: string;
}>;

export type GatewayBlogPatchDto = Readonly<{
  readonly "body"?: string;
  readonly "categories"?: ReadonlyArray<string>;
  readonly "coverImageUrl"?: string;
  readonly "excerpt"?: string;
  readonly "metaDescription"?: string;
  readonly "metaKeywords"?: string;
  readonly "metaTitle"?: string;
  readonly "status"?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly "tags"?: ReadonlyArray<string>;
  readonly "title"?: string;
}>;

export type GatewayBlogPostDto = Readonly<{
  readonly "body": string;
  readonly "categories": ReadonlyArray<string>;
  readonly "coverImageUrl": string;
  readonly "createdAt": string;
  readonly "excerpt": string;
  readonly "id": string;
  readonly "metaDescription": string;
  readonly "metaKeywords": string;
  readonly "metaTitle": string;
  readonly "publishedAt": string;
  readonly "slug": string;
  readonly "status": "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly "tags": ReadonlyArray<string>;
  readonly "title": string;
  readonly "updatedAt": string;
}>;

export type GatewayBlogWriteDto = Readonly<{
  readonly "body": string;
  readonly "categories"?: ReadonlyArray<string>;
  readonly "coverImageUrl"?: string;
  readonly "excerpt"?: string;
  readonly "metaDescription"?: string;
  readonly "metaKeywords"?: string;
  readonly "metaTitle"?: string;
  readonly "slug"?: string;
  readonly "status"?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly "tags"?: ReadonlyArray<string>;
  readonly "title": string;
}>;

export type GatewayBulkResultDto = Readonly<{
  readonly "updated": number;
}>;

export type GatewayCartAddDto = Readonly<{
  readonly "productId": string;
  readonly "quantity": number;
}>;

export type GatewayCartDto = Readonly<{
  readonly "currency": string;
  readonly "expiresAt": string;
  readonly "id": string;
  readonly "items": ReadonlyArray<GatewayCartItemDto>;
  readonly "userId": string;
}>;

export type GatewayCartItemDto = Readonly<{
  readonly "id": string;
  readonly "meta": string;
  readonly "name": string;
  readonly "productId": string;
  readonly "quantity": number;
  readonly "sku": string;
  readonly "unitPrice": string;
}>;

export type GatewayCartUpdateDto = Readonly<{
  readonly "quantity": number;
}>;

export type GatewayCheckoutDto = Readonly<{
  readonly "note"?: string;
}>;

export type GatewayCollectionEnvelopeDto = Readonly<{
  readonly "data": ReadonlyArray<Readonly<Record<never, never>> & Readonly<Record<string, unknown>>>;
  readonly "meta": GatewayCollectionMetaDto;
  readonly "requestId": string;
}>;

export type GatewayCollectionMetaDto = Readonly<{
  readonly "pagination": PageLimitTotalPaginationDto | TotalOnlyPaginationDto | OffsetTakePaginationDto | UnpaginatedPaginationDto;
}>;

export type GatewayErrorBodyDto = Readonly<{
  readonly "code": "BAD_REQUEST" | "VALIDATION_FAILED" | "CLIENT_ID_REQUIRED" | "APPLICATION_NOT_ALLOWED" | "AUTHENTICATION_REQUIRED" | "ACCESS_DENIED" | "NOT_FOUND" | "CONFLICT" | "REQUEST_TOO_LARGE" | "RATE_LIMITED" | "UPSTREAM_TIMEOUT" | "UPSTREAM_UNAVAILABLE" | "NOT_IMPLEMENTED" | "IDEMPOTENCY_KEY_REQUIRED" | "IDEMPOTENCY_KEY_INVALID" | "IDEMPOTENCY_NOT_SUPPORTED" | "IDEMPOTENCY_CONFLICT" | "IDEMPOTENCY_IN_PROGRESS" | "IDEMPOTENCY_STORE_UNAVAILABLE" | "INTERNAL_ERROR";
  readonly "details"?: ReadonlyArray<GatewayValidationDetailDto>;
  readonly "message": string;
}>;

export type GatewayErrorEnvelopeDto = Readonly<{
  readonly "error": GatewayErrorBodyDto;
  readonly "requestId": string;
}>;

export type GatewayGalleryAddDto = Readonly<{
  readonly "images": ReadonlyArray<GatewayGalleryImageInputDto>;
}>;

export type GatewayGalleryAdminQueryDto = Readonly<{
  readonly "includeDeleted"?: boolean;
}>;

export type GatewayGalleryImageDto = Readonly<{
  readonly "alt": string;
  readonly "deletedAt": string;
  readonly "id": string;
  readonly "sort": number;
  readonly "url": string;
}>;

export type GatewayGalleryImageInputDto = Readonly<{
  readonly "alt"?: string;
  readonly "sort"?: number;
  readonly "url": string;
}>;

export type GatewayGalleryOrderDto = Readonly<{
  readonly "orders": ReadonlyArray<GatewayGalleryOrderItemDto>;
}>;

export type GatewayGalleryOrderItemDto = Readonly<{
  readonly "id": string;
  readonly "sort": number;
}>;

export type GatewayGalleryRemoveQueryDto = Readonly<{
  readonly "hardDelete"?: boolean;
}>;

export type GatewayItemEnvelopeDto = Readonly<{
  readonly "data": Readonly<Record<never, never>> & Readonly<Record<string, unknown>>;
  readonly "requestId": string;
}>;

export type GatewayMediaAdminListQueryDto = Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "ownerId"?: string;
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;

export type GatewayMediaDeleteConfirmDto = Readonly<{
  readonly "confirmToken": string;
  readonly "items": ReadonlyArray<GatewayMediaDeleteItemDto>;
  readonly "recursive"?: boolean;
  readonly "scope"?: string;
}>;

export type GatewayMediaDeleteConfirmResultDto = Readonly<{
  readonly "deleted": boolean;
  readonly "fileCount": number;
  readonly "folderCount": number;
  readonly "totalSizeBytes": string;
}>;

export type GatewayMediaDeleteFileDto = Readonly<{
  readonly "displayName": string;
  readonly "folderPath": string;
  readonly "id": string;
  readonly "mimeType": string;
  readonly "path": string;
  readonly "sizeBytes": string;
  readonly "type": string;
}>;

export type GatewayMediaDeleteFolderDto = Readonly<{
  readonly "fileCount": number;
  readonly "folderPath": string;
  readonly "type": string;
}>;

export type GatewayMediaDeleteItemDto = Readonly<{
  readonly "folderPath"?: string;
  readonly "id"?: string;
  readonly "type": "file" | "folder";
}>;

export type GatewayMediaDeletePreviewDto = Readonly<{
  readonly "items": ReadonlyArray<GatewayMediaDeleteItemDto>;
  readonly "recursive"?: boolean;
  readonly "scope"?: string;
}>;

export type GatewayMediaDeletePreviewResultDto = Readonly<{
  readonly "canDelete": boolean;
  readonly "confirmToken": string;
  readonly "expiresIn": number;
  readonly "fileCount": number;
  readonly "files": ReadonlyArray<GatewayMediaDeleteFileDto>;
  readonly "folderCount": number;
  readonly "folders": ReadonlyArray<GatewayMediaDeleteFolderDto>;
  readonly "recursive": boolean;
  readonly "scope": string;
  readonly "totalSizeBytes": string;
  readonly "warnings": ReadonlyArray<GatewayMediaDeleteWarningDto>;
}>;

export type GatewayMediaDeleteResultDto = Readonly<{
  readonly "deleted": boolean;
}>;

export type GatewayMediaDeleteWarningDto = Readonly<{
  readonly "code": string;
  readonly "fileCount": number;
  readonly "folderPath": string;
  readonly "limit": number;
}>;

export type GatewayMediaDto = Readonly<{
  readonly "accessClass": "PUBLIC" | "PROTECTED" | "STRICT";
  readonly "bucket": string;
  readonly "createdAt": string;
  readonly "displayName": string;
  readonly "durationSec": number;
  readonly "entityId": string;
  readonly "entityType": string;
  readonly "etag": string;
  readonly "filename": string;
  readonly "folderPath": string;
  readonly "height": number;
  readonly "id": string;
  readonly "mimeType": string;
  readonly "originalFilename": string;
  readonly "ownerId": string;
  readonly "path": string;
  readonly "promotedAt": string;
  readonly "quarantineReason": string;
  readonly "scanStatus": string;
  readonly "scope": string;
  readonly "sha256": string;
  readonly "sizeBytes": string;
  readonly "status": string;
  readonly "storage": string;
  readonly "updatedAt": string;
  readonly "visibility": "private" | "public";
  readonly "width": number;
}>;

export type GatewayMediaFinalizeDto = Readonly<{
  readonly "bucket"?: string;
  readonly "displayName"?: string;
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "filename"?: string;
  readonly "folderPath"?: string;
  readonly "mimeType"?: string;
  readonly "originalFilename"?: string;
  readonly "ownerId"?: string;
  readonly "path": string;
  readonly "scope"?: string;
  readonly "sha256"?: string;
  readonly "storage": "s3";
}>;

export type GatewayMediaListQueryDto = Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;

export type GatewayMediaOwnedReadUrlQueryDto = Readonly<{
  readonly "download"?: boolean;
  readonly "entityId": string;
  readonly "entityType": string;
  readonly "scope": string;
}>;

export type GatewayMediaPresignDto = Readonly<{
  readonly "displayName"?: string;
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "filename": string;
  readonly "folderPath"?: string;
  readonly "mimeType": string;
  readonly "ownerId"?: string;
  readonly "scope"?: string;
}>;

export type GatewayMediaPresignResultDto = Readonly<{
  readonly "accessClass": string;
  readonly "bucket": string;
  readonly "displayName": string;
  readonly "entityId": string;
  readonly "entityType": string;
  readonly "expiresIn": number;
  readonly "filename": string;
  readonly "folderPath": string;
  readonly "mimeType": string;
  readonly "originalFilename": string;
  readonly "ownerId": string;
  readonly "path": string;
  readonly "scope": string;
  readonly "storage": string;
  readonly "uploadUrl": string;
  readonly "visibility": string;
}>;

export type GatewayMediaReadUrlQueryDto = Readonly<{
  readonly "download"?: boolean;
}>;

export type GatewayMediaReadUrlResultDto = Readonly<{
  readonly "accessClass": string;
  readonly "expiresIn": number;
  readonly "filename": string;
  readonly "mimeType": string;
  readonly "url": string;
}>;

export type GatewayMediaRenderQueryDto = Readonly<{
  readonly "variant"?: "web";
}>;

export type GatewayOrderDto = Readonly<{
  readonly "billingAddress": string;
  readonly "createdAt": string;
  readonly "currency": string;
  readonly "discountTotal": string;
  readonly "id": string;
  readonly "items": ReadonlyArray<GatewayOrderItemDto>;
  readonly "meta": string;
  readonly "orderNumber": string;
  readonly "shippingAddress": string;
  readonly "status": "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
  readonly "subtotal": string;
  readonly "taxTotal": string;
  readonly "total": string;
  readonly "updatedAt": string;
  readonly "userId": string;
}>;

export type GatewayOrderItemDto = Readonly<{
  readonly "id": string;
  readonly "lineTotal": string;
  readonly "meta": string;
  readonly "name": string;
  readonly "productId": string;
  readonly "quantity": number;
  readonly "sku": string;
  readonly "unitPrice": string;
}>;

export type GatewayOrderListQueryDto = Readonly<{
  readonly "status"?: "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
}>;

export type GatewayOrderStatusUpdateDto = Readonly<{
  readonly "status": "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
}>;

export type GatewayProductBulkDiscountDto = Readonly<{
  readonly "categoryId"?: string;
  readonly "discountActive"?: boolean;
  readonly "discountEnd"?: string;
  readonly "discountStart"?: string;
  readonly "discountType"?: "PERCENTAGE" | "FIXED" | "NONE";
  readonly "discountValue"?: number;
  readonly "ids"?: ReadonlyArray<string>;
  readonly "q"?: string;
  readonly "status"?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}>;

export type GatewayProductDto = Readonly<{
  readonly "categoryId": string;
  readonly "complementaryIds": ReadonlyArray<string>;
  readonly "createdAt": string;
  readonly "currency": string;
  readonly "customSchema": string;
  readonly "deletedAt": string;
  readonly "description": string;
  readonly "discountActive": boolean;
  readonly "discountEnd": string;
  readonly "discountStart": string;
  readonly "discountType": "PERCENTAGE" | "FIXED" | "NONE";
  readonly "discountValue": number;
  readonly "effectivePrice": number;
  readonly "excerpt": string;
  readonly "featureSort": number;
  readonly "id": string;
  readonly "isFeatured": boolean;
  readonly "metaDescription": string;
  readonly "metaKeywords": string;
  readonly "metaTitle": string;
  readonly "model3dFormat": string;
  readonly "model3dLiveView": boolean;
  readonly "model3dPosterUrl": string;
  readonly "model3dUrl": string;
  readonly "noindex": boolean;
  readonly "price": number;
  readonly "promoActive": boolean;
  readonly "promoBadge": string;
  readonly "promoTitle": string;
  readonly "sku": string;
  readonly "slug": string;
  readonly "status": "DRAFT" | "ACTIVE" | "ARCHIVED";
  readonly "tags": ReadonlyArray<string>;
  readonly "thumbnailUrl": string;
  readonly "title": string;
  readonly "updatedAt": string;
  readonly "vrEnabled": boolean;
  readonly "vrPlanImageUrl": string;
}>;

export type GatewayProductListQueryDto = Readonly<{
  readonly "categoryId"?: string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
}>;

export type GatewayProductPatchDto = Readonly<{
  readonly "categoryId"?: string;
  readonly "complementaryIds"?: ReadonlyArray<string>;
  readonly "content"?: string;
  readonly "currency"?: string;
  readonly "customSchema"?: string;
  readonly "discountActive"?: boolean;
  readonly "discountEnd"?: string;
  readonly "discountStart"?: string;
  readonly "discountType"?: "PERCENTAGE" | "FIXED" | "NONE";
  readonly "discountValue"?: number;
  readonly "excerpt"?: string;
  readonly "featureSort"?: number;
  readonly "isFeatured"?: boolean;
  readonly "metaDescription"?: string;
  readonly "metaKeywords"?: string;
  readonly "metaTitle"?: string;
  readonly "model3dFormat"?: string;
  readonly "model3dLiveView"?: boolean;
  readonly "model3dPosterUrl"?: string;
  readonly "model3dUrl"?: string;
  readonly "noindex"?: boolean;
  readonly "price"?: number;
  readonly "promoActive"?: boolean;
  readonly "promoBadge"?: string;
  readonly "promoTitle"?: string;
  readonly "sku"?: string;
  readonly "slug"?: string;
  readonly "status"?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  readonly "tags"?: ReadonlyArray<string>;
  readonly "thumbnailUrl"?: string;
  readonly "title"?: string;
  readonly "vrEnabled"?: boolean;
  readonly "vrPlanImageUrl"?: string;
}>;

export type GatewayProductWriteDto = Readonly<{
  readonly "categoryId"?: string;
  readonly "complementaryIds"?: ReadonlyArray<string>;
  readonly "content"?: string;
  readonly "currency"?: string;
  readonly "customSchema"?: string;
  readonly "discountActive"?: boolean;
  readonly "discountEnd"?: string;
  readonly "discountStart"?: string;
  readonly "discountType"?: "PERCENTAGE" | "FIXED" | "NONE";
  readonly "discountValue"?: number;
  readonly "excerpt"?: string;
  readonly "featureSort"?: number;
  readonly "isFeatured"?: boolean;
  readonly "metaDescription"?: string;
  readonly "metaKeywords"?: string;
  readonly "metaTitle"?: string;
  readonly "model3dFormat"?: string;
  readonly "model3dLiveView"?: boolean;
  readonly "model3dPosterUrl"?: string;
  readonly "model3dUrl"?: string;
  readonly "noindex"?: boolean;
  readonly "price"?: number;
  readonly "promoActive"?: boolean;
  readonly "promoBadge"?: string;
  readonly "promoTitle"?: string;
  readonly "sku"?: string;
  readonly "slug"?: string;
  readonly "status"?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  readonly "tags"?: ReadonlyArray<string>;
  readonly "thumbnailUrl"?: string;
  readonly "title": string;
  readonly "vrEnabled"?: boolean;
  readonly "vrPlanImageUrl"?: string;
}>;

export type GatewaySettingDeleteResultDto = Readonly<{
  readonly "deleted": boolean;
}>;

export type GatewaySettingReadDto = Readonly<{
  readonly "found": boolean;
  readonly "value": string;
}>;

export type GatewaySettingValueDto = Readonly<{
  readonly "value": string;
}>;

export type GatewaySettingWriteRequestDto = Readonly<{
  readonly "value": string;
}>;

export type GatewayTaxonomyDeleteResultDto = Readonly<{
  readonly "success": boolean;
}>;

export type GatewayTaxonomyDto = Readonly<{
  readonly "createdAt": string;
  readonly "description": string;
  readonly "hasChildren": boolean;
  readonly "id": string;
  readonly "isHidden": boolean;
  readonly "isSystem": boolean;
  readonly "kind": string;
  readonly "parentId": string;
  readonly "path": string;
  readonly "scope": "product" | "blog";
  readonly "slug": string;
  readonly "sortOrder": number;
  readonly "title": string;
  readonly "updatedAt": string;
}>;

export type GatewayTaxonomyListQueryDto = Readonly<{
  readonly "kind": string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "parentId"?: string;
  readonly "q"?: string;
}>;

export type GatewayTaxonomyPatchDto = Readonly<{
  readonly "description"?: string;
  readonly "isHidden"?: boolean;
  readonly "parentId"?: string;
  readonly "slug"?: string;
  readonly "sortOrder"?: number;
  readonly "title"?: string;
}>;

export type GatewayTaxonomyWriteDto = Readonly<{
  readonly "description"?: string;
  readonly "isHidden"?: boolean;
  readonly "kind": string;
  readonly "parentId"?: string;
  readonly "slug": string;
  readonly "sortOrder"?: number;
  readonly "title": string;
}>;

export type GatewayUserDto = Readonly<{
  readonly "email": string;
  readonly "id": string;
  readonly "role": "user" | "admin" | "root-admin";
}>;

export type GatewayUserListItemDto = Readonly<{
  readonly "createdAt": string;
  readonly "email": string;
  readonly "id": string;
  readonly "phone"?: string;
  readonly "role": "user" | "admin" | "root-admin";
}>;

export type GatewayUserUpdateRequestDto = Readonly<{
  readonly "currentPassword"?: string;
  readonly "email"?: string;
  readonly "newPassword"?: string;
}>;

export type GatewayValidationDetailDto = Readonly<{
  readonly "code": "unknown_field" | "required_field" | "invalid_type" | "invalid_format" | "invalid_value" | "out_of_range" | "unsupported_combination" | "too_many_items";
  readonly "field": string;
}>;

export type OffsetTakePaginationDto = Readonly<{
  readonly "profile": "offset-take";
  readonly "skip": number;
  readonly "take": number;
}>;

export type PageLimitTotalPaginationDto = Readonly<{
  readonly "limit": number;
  readonly "page": number;
  readonly "profile": "page-limit-total";
  readonly "total": number;
}>;

export type TotalOnlyPaginationDto = Readonly<{
  readonly "profile": "total-only";
  readonly "total": number;
}>;

export type UnpaginatedPaginationDto = Readonly<{
  readonly "profile": "unpaginated";
}>;

export interface GatewayOperationMap {
  readonly "admin_blog_posts_create": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/blog/posts";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayBlogWriteDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayBlogPostDto;
}>;
  }>;
  readonly "admin_blog_posts_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/blog/posts/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayBlogDeleteResultDto;
}>;
  }>;
  readonly "admin_blog_posts_update": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/admin/blog/posts/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayBlogPatchDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayBlogPostDto;
}>;
  }>;
  readonly "admin_blog_taxonomies_create": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/blog-taxonomies";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayTaxonomyWriteDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "admin_blog_taxonomies_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/blog-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDeleteResultDto;
}>;
  }>;
  readonly "admin_blog_taxonomies_update": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/admin/blog-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayTaxonomyPatchDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "admin_media_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/media/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDto;
}>;
  }>;
  readonly "admin_media_protected_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/media/protected-library/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDeleteResultDto;
}>;
  }>;
  readonly "admin_media_protected_finalize": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/protected-library/finalize";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaFinalizeDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDto;
}>;
  }>;
  readonly "admin_media_protected_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/media/protected-library";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "ownerId"?: string;
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayMediaDto>;
}>;
  }>;
  readonly "admin_media_protected_presign": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/protected-library/presign";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaPresignDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaPresignResultDto;
}>;
  }>;
  readonly "admin_media_protected_read_url": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/protected-library/{id}/read-url";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "download"?: boolean;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaReadUrlResultDto;
}>;
  }>;
  readonly "admin_media_public_delete_confirm": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/public-library/delete-confirm";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaDeleteConfirmDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDeleteConfirmResultDto;
}>;
  }>;
  readonly "admin_media_public_delete_preview": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/public-library/delete-preview";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaDeletePreviewDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDeletePreviewResultDto;
}>;
  }>;
  readonly "admin_media_public_finalize": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/public-library/finalize";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaFinalizeDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDto;
}>;
  }>;
  readonly "admin_media_public_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/media/public-library";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayMediaDto>;
}>;
  }>;
  readonly "admin_media_public_presign": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/public-library/presign";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaPresignDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaPresignResultDto;
}>;
  }>;
  readonly "admin_media_public_read_url": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/public-library/{id}/read-url";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "download"?: boolean;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaReadUrlResultDto;
}>;
  }>;
  readonly "admin_media_strict_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/media/strict-library/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDeleteResultDto;
}>;
  }>;
  readonly "admin_media_strict_finalize": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/strict-library/finalize";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaFinalizeDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaDto;
}>;
  }>;
  readonly "admin_media_strict_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/media/strict-library";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "ownerId"?: string;
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayMediaDto>;
}>;
  }>;
  readonly "admin_media_strict_presign": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/strict-library/presign";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayMediaPresignDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaPresignResultDto;
}>;
  }>;
  readonly "admin_media_strict_read_url": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/media/strict-library/{id}/read-url";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "download"?: boolean;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaReadUrlResultDto;
}>;
  }>;
  readonly "admin_orders_status": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/admin/orders/{id}/status";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayOrderStatusUpdateDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayOrderDto;
}>;
  }>;
  readonly "admin_product_taxonomies_create": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/product-taxonomies";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayTaxonomyWriteDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "admin_product_taxonomies_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/product-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDeleteResultDto;
}>;
  }>;
  readonly "admin_product_taxonomies_update": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/admin/product-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayTaxonomyPatchDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "admin_products_bulk_discount": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/products/discounts/bulk";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayProductBulkDiscountDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayBulkResultDto;
}>;
  }>;
  readonly "admin_products_create": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/products";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayProductWriteDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_products_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/products/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_products_gallery_add": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/products/{id}/gallery";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayGalleryAddDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayGalleryImageDto>;
}>;
  }>;
  readonly "admin_products_gallery_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/products/{id}/gallery";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "includeDeleted"?: boolean;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayGalleryImageDto>;
}>;
  }>;
  readonly "admin_products_gallery_order": Readonly<{
    method: "PUT";
    pathTemplate: "/api/v1/admin/products/{id}/gallery/order";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayGalleryOrderDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayGalleryImageDto>;
}>;
  }>;
  readonly "admin_products_gallery_remove": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/products/{id}/gallery/{imageId}";
    path: Readonly<{
  readonly "id": string;
  readonly "imageId": string;
}>;
    query: Readonly<{
  readonly "hardDelete"?: boolean;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayGalleryImageDto>;
}>;
  }>;
  readonly "admin_products_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/products/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_products_hard_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/products/{id}/hard";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_products_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/products";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "categoryId"?: string;
  readonly "includeDeleted"?: boolean;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
  readonly "status"?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayProductDto>;
}>;
  }>;
  readonly "admin_products_restore": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/admin/products/{id}/restore";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_products_update": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/admin/products/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayProductPatchDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "admin_settings_delete": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/admin/settings/{ns}/{key}";
    path: Readonly<{
  readonly "key": string;
  readonly "ns": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewaySettingDeleteResultDto;
}>;
  }>;
  readonly "admin_settings_set": Readonly<{
    method: "PUT";
    pathTemplate: "/api/v1/admin/settings/{ns}/{key}";
    path: Readonly<{
  readonly "key": string;
  readonly "ns": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewaySettingWriteRequestDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewaySettingValueDto;
}>;
  }>;
  readonly "admin_users_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/users/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayUserDto;
}>;
  }>;
  readonly "admin_users_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/admin/users";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayUserListItemDto>;
}>;
  }>;
  readonly "auth_login": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/auth/login";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayAuthLoginRequestDto;
    bodyRequired: true;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayAuthTokenDto;
}>;
  }>;
  readonly "auth_logout": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/auth/logout";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayAuthLogoutRequestDto;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayAuthLogoutResultDto;
}>;
  }>;
  readonly "auth_me": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/auth/me";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayUserDto;
}>;
  }>;
  readonly "auth_refresh": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/auth/refresh";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayAuthRefreshRequestDto;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayAuthTokenDto;
}>;
  }>;
  readonly "auth_register": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/auth/register";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayAuthRegisterRequestDto;
    bodyRequired: true;
    requiresAccessToken: false;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayUserDto;
}>;
  }>;
  readonly "blog_posts_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/blog/posts/{slug}";
    path: Readonly<{
  readonly "slug": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayBlogPostDto;
}>;
  }>;
  readonly "blog_posts_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/blog/posts";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "category"?: string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
  readonly "tag"?: string;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayBlogPostDto>;
}>;
  }>;
  readonly "blog_taxonomies_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/blog-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "blog_taxonomies_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/blog-taxonomies";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "kind": string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "parentId"?: string;
  readonly "q"?: string;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayTaxonomyDto>;
}>;
  }>;
  readonly "media_owned_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/media/my/protected-library";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "entityId"?: string;
  readonly "entityType"?: string;
  readonly "folderPath"?: string;
  readonly "mediaType"?: "image" | "video" | "audio" | "document";
  readonly "mimeType"?: string;
  readonly "order"?: "asc" | "desc";
  readonly "path"?: string;
  readonly "q"?: string;
  readonly "scanStatus"?: "NONE" | "QUEUED" | "SCANNING" | "CLEAN" | "INFECTED" | "FAILED";
  readonly "scope"?: string;
  readonly "search"?: string;
  readonly "skip"?: number;
  readonly "sortBy"?: "name" | "createdAt" | "updatedAt" | "size";
  readonly "status"?: "PENDING" | "READY" | "BLOCKED" | "DELETED";
  readonly "take"?: number;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayMediaDto>;
}>;
  }>;
  readonly "media_owned_read_url": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/media/my/protected-library/{id}/read-url";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "download"?: boolean;
  readonly "entityId": string;
  readonly "entityType": string;
  readonly "scope": string;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayMediaReadUrlResultDto;
}>;
  }>;
  readonly "media_render": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/media/render/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<{
  readonly "variant"?: "web";
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "binary";
    response: ArrayBuffer;
  }>;
  readonly "orders_cart_add": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/orders/cart/items";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayCartAddDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayCartDto;
}>;
  }>;
  readonly "orders_cart_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/orders/cart";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayCartDto;
}>;
  }>;
  readonly "orders_cart_remove": Readonly<{
    method: "DELETE";
    pathTemplate: "/api/v1/orders/cart/items/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayCartDto;
}>;
  }>;
  readonly "orders_cart_update": Readonly<{
    method: "PATCH";
    pathTemplate: "/api/v1/orders/cart/items/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: GatewayCartUpdateDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayCartDto;
}>;
  }>;
  readonly "orders_checkout": Readonly<{
    method: "POST";
    pathTemplate: "/api/v1/orders/checkout";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayCheckoutDto;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayOrderDto;
}>;
  }>;
  readonly "orders_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/orders/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayOrderDto;
}>;
  }>;
  readonly "orders_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/orders";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "status"?: "PENDING" | "PAID" | "FULFILLED" | "CANCELLED";
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayOrderDto>;
}>;
  }>;
  readonly "product_taxonomies_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/product-taxonomies/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayTaxonomyDto;
}>;
  }>;
  readonly "product_taxonomies_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/product-taxonomies";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "kind": string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "parentId"?: string;
  readonly "q"?: string;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayTaxonomyDto>;
}>;
  }>;
  readonly "products_gallery_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/products/{id}/gallery";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayGalleryImageDto>;
}>;
  }>;
  readonly "products_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/products/{id}";
    path: Readonly<{
  readonly "id": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayProductDto;
}>;
  }>;
  readonly "products_list": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/products";
    path: Readonly<Record<never, never>>;
    query: Readonly<{
  readonly "categoryId"?: string;
  readonly "limit"?: number;
  readonly "page"?: number;
  readonly "q"?: string;
}>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayCollectionEnvelopeDto & Readonly<{
  readonly "data"?: ReadonlyArray<GatewayProductDto>;
}>;
  }>;
  readonly "settings_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/settings/{ns}/{key}";
    path: Readonly<{
  readonly "key": string;
  readonly "ns": string;
}>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: false;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewaySettingReadDto;
}>;
  }>;
  readonly "users_me_get": Readonly<{
    method: "GET";
    pathTemplate: "/api/v1/users/me";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: never;
    bodyRequired: false;
    requiresAccessToken: true;
    requiresIdempotencyKey: false;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayUserDto;
}>;
  }>;
  readonly "users_me_update": Readonly<{
    method: "PUT";
    pathTemplate: "/api/v1/users/me";
    path: Readonly<Record<never, never>>;
    query: Readonly<Record<never, never>>;
    body: GatewayUserUpdateRequestDto;
    bodyRequired: true;
    requiresAccessToken: true;
    requiresIdempotencyKey: true;
    responseKind: "json";
    response: GatewayItemEnvelopeDto & Readonly<{
  readonly "data"?: GatewayUserDto;
}>;
  }>;
}

export type GatewayOperationId = keyof GatewayOperationMap;

export type GatewayRuntimeOperation = Readonly<{
  method: string;
  pathTemplate: string;
  bodyRequired: boolean;
  requiresAccessToken: boolean;
  requiresIdempotencyKey: boolean;
  responseKind: "json" | "binary";
}>;

export const gatewayOperations = {
  "admin_blog_posts_create": {
    method: "POST",
    pathTemplate: "/api/v1/admin/blog/posts",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_blog_posts_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/blog/posts/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_blog_posts_update": {
    method: "PATCH",
    pathTemplate: "/api/v1/admin/blog/posts/{id}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_blog_taxonomies_create": {
    method: "POST",
    pathTemplate: "/api/v1/admin/blog-taxonomies",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_blog_taxonomies_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/blog-taxonomies/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_blog_taxonomies_update": {
    method: "PATCH",
    pathTemplate: "/api/v1/admin/blog-taxonomies/{id}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_get": {
    method: "GET",
    pathTemplate: "/api/v1/admin/media/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_media_protected_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/media/protected-library/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_protected_finalize": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/protected-library/finalize",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_protected_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/media/protected-library",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_media_protected_presign": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/protected-library/presign",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_protected_read_url": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/protected-library/{id}/read-url",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_public_delete_confirm": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/public-library/delete-confirm",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_public_delete_preview": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/public-library/delete-preview",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_public_finalize": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/public-library/finalize",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_public_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/media/public-library",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_media_public_presign": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/public-library/presign",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_public_read_url": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/public-library/{id}/read-url",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_strict_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/media/strict-library/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_strict_finalize": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/strict-library/finalize",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_strict_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/media/strict-library",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_media_strict_presign": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/strict-library/presign",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_media_strict_read_url": {
    method: "POST",
    pathTemplate: "/api/v1/admin/media/strict-library/{id}/read-url",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_orders_status": {
    method: "PATCH",
    pathTemplate: "/api/v1/admin/orders/{id}/status",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_product_taxonomies_create": {
    method: "POST",
    pathTemplate: "/api/v1/admin/product-taxonomies",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_product_taxonomies_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/product-taxonomies/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_product_taxonomies_update": {
    method: "PATCH",
    pathTemplate: "/api/v1/admin/product-taxonomies/{id}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_bulk_discount": {
    method: "POST",
    pathTemplate: "/api/v1/admin/products/discounts/bulk",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_create": {
    method: "POST",
    pathTemplate: "/api/v1/admin/products",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/products/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_gallery_add": {
    method: "POST",
    pathTemplate: "/api/v1/admin/products/{id}/gallery",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_gallery_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/products/{id}/gallery",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_products_gallery_order": {
    method: "PUT",
    pathTemplate: "/api/v1/admin/products/{id}/gallery/order",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_gallery_remove": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/products/{id}/gallery/{imageId}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_get": {
    method: "GET",
    pathTemplate: "/api/v1/admin/products/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_products_hard_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/products/{id}/hard",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/products",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_products_restore": {
    method: "POST",
    pathTemplate: "/api/v1/admin/products/{id}/restore",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_products_update": {
    method: "PATCH",
    pathTemplate: "/api/v1/admin/products/{id}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_settings_delete": {
    method: "DELETE",
    pathTemplate: "/api/v1/admin/settings/{ns}/{key}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_settings_set": {
    method: "PUT",
    pathTemplate: "/api/v1/admin/settings/{ns}/{key}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "admin_users_get": {
    method: "GET",
    pathTemplate: "/api/v1/admin/users/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "admin_users_list": {
    method: "GET",
    pathTemplate: "/api/v1/admin/users",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "auth_login": {
    method: "POST",
    pathTemplate: "/api/v1/auth/login",
    bodyRequired: true,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "auth_logout": {
    method: "POST",
    pathTemplate: "/api/v1/auth/logout",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "auth_me": {
    method: "GET",
    pathTemplate: "/api/v1/auth/me",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "auth_refresh": {
    method: "POST",
    pathTemplate: "/api/v1/auth/refresh",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "auth_register": {
    method: "POST",
    pathTemplate: "/api/v1/auth/register",
    bodyRequired: true,
    requiresAccessToken: false,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "blog_posts_get": {
    method: "GET",
    pathTemplate: "/api/v1/blog/posts/{slug}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "blog_posts_list": {
    method: "GET",
    pathTemplate: "/api/v1/blog/posts",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "blog_taxonomies_get": {
    method: "GET",
    pathTemplate: "/api/v1/blog-taxonomies/{id}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "blog_taxonomies_list": {
    method: "GET",
    pathTemplate: "/api/v1/blog-taxonomies",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "media_owned_list": {
    method: "GET",
    pathTemplate: "/api/v1/media/my/protected-library",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "media_owned_read_url": {
    method: "POST",
    pathTemplate: "/api/v1/media/my/protected-library/{id}/read-url",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "media_render": {
    method: "GET",
    pathTemplate: "/api/v1/media/render/{id}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "binary",
  },
  "orders_cart_add": {
    method: "POST",
    pathTemplate: "/api/v1/orders/cart/items",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "orders_cart_get": {
    method: "GET",
    pathTemplate: "/api/v1/orders/cart",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "orders_cart_remove": {
    method: "DELETE",
    pathTemplate: "/api/v1/orders/cart/items/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "orders_cart_update": {
    method: "PATCH",
    pathTemplate: "/api/v1/orders/cart/items/{id}",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "orders_checkout": {
    method: "POST",
    pathTemplate: "/api/v1/orders/checkout",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
  "orders_get": {
    method: "GET",
    pathTemplate: "/api/v1/orders/{id}",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "orders_list": {
    method: "GET",
    pathTemplate: "/api/v1/orders",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "product_taxonomies_get": {
    method: "GET",
    pathTemplate: "/api/v1/product-taxonomies/{id}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "product_taxonomies_list": {
    method: "GET",
    pathTemplate: "/api/v1/product-taxonomies",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "products_gallery_list": {
    method: "GET",
    pathTemplate: "/api/v1/products/{id}/gallery",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "products_get": {
    method: "GET",
    pathTemplate: "/api/v1/products/{id}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "products_list": {
    method: "GET",
    pathTemplate: "/api/v1/products",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "settings_get": {
    method: "GET",
    pathTemplate: "/api/v1/settings/{ns}/{key}",
    bodyRequired: false,
    requiresAccessToken: false,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "users_me_get": {
    method: "GET",
    pathTemplate: "/api/v1/users/me",
    bodyRequired: false,
    requiresAccessToken: true,
    requiresIdempotencyKey: false,
    responseKind: "json",
  },
  "users_me_update": {
    method: "PUT",
    pathTemplate: "/api/v1/users/me",
    bodyRequired: true,
    requiresAccessToken: true,
    requiresIdempotencyKey: true,
    responseKind: "json",
  },
} as const satisfies Readonly<Record<GatewayOperationId, GatewayRuntimeOperation>>;
