import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  gatewayActionEnvelope,
  gatewayCollectionEnvelope,
  gatewayItemEnvelope,
} from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayProductApiService } from "./gateway-product-api.service";
import {
  GatewayAdminProductListQueryDto,
  GatewayBulkResultDto,
  GatewayGalleryAddDto,
  GatewayGalleryAdminQueryDto,
  GatewayGalleryImageDto,
  GatewayGalleryOrderDto,
  GatewayGalleryRemoveQueryDto,
  GatewayProductBulkDiscountDto,
  GatewayProductDto,
  GatewayProductGalleryPathDto,
  GatewayProductListQueryDto,
  GatewayProductPatchDto,
  GatewayProductWriteDto,
} from "./product-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Products")
@Controller()
export class GatewayProductController {
  constructor(private readonly products: GatewayProductApiService) {}

  @GatewayApiRoute("products.list", {
    queryType: GatewayProductListQueryDto,
    responseType: GatewayProductDto,
  })
  async listPublic(
    @Req() request: GatewayHttpRequest,
    @Query() query: GatewayProductListQueryDto,
  ) {
    const result = await this.products.listPublic(request, query);
    return gatewayCollectionEnvelope(
      result.data,
      { profile: "total-only", total: result.total },
      requestId(request),
    );
  }

  @GatewayApiRoute("products.get", { responseType: GatewayProductDto })
  async getPublic(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.getPublic(request, params.id),
      requestId(request),
    );
  }

  @GatewayApiRoute("products.gallery.list", {
    responseType: GatewayGalleryImageDto,
  })
  async listPublicGallery(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayCollectionEnvelope(
      await this.products.listGallery(request, params.id, true),
      { profile: "unpaginated" },
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.list", {
    queryType: GatewayAdminProductListQueryDto,
    responseType: GatewayProductDto,
  })
  async listAdmin(
    @Req() request: GatewayHttpRequest,
    @Query() query: GatewayAdminProductListQueryDto,
  ) {
    const result = await this.products.listAdmin(request, query);
    return gatewayCollectionEnvelope(
      result.data,
      { profile: "total-only", total: result.total },
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.get", { responseType: GatewayProductDto })
  async getAdmin(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.getAdmin(request, params.id),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.create", {
    requestType: GatewayProductWriteDto,
    responseType: GatewayProductDto,
  })
  async create(
    @Req() request: GatewayHttpRequest,
    @Body() body: GatewayProductWriteDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.create(request, body),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.update", {
    requestType: GatewayProductPatchDto,
    responseType: GatewayProductDto,
  })
  async update(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayProductPatchDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.update(request, params.id, body),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.delete", { responseType: GatewayProductDto })
  async delete(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.mutateById(request, params.id, "delete"),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.restore", { responseType: GatewayProductDto })
  async restore(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.mutateById(request, params.id, "restore"),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.hard-delete", {
    responseType: GatewayProductDto,
  })
  async hardDelete(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
  ) {
    return gatewayItemEnvelope(
      await this.products.mutateById(request, params.id, "hardDelete"),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.bulk-discount", {
    requestType: GatewayProductBulkDiscountDto,
    responseType: GatewayBulkResultDto,
  })
  async bulkDiscount(
    @Req() request: GatewayHttpRequest,
    @Body() body: GatewayProductBulkDiscountDto,
  ) {
    return gatewayActionEnvelope(
      await this.products.applyDiscount(request, body),
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.gallery.list", {
    queryType: GatewayGalleryAdminQueryDto,
    responseType: GatewayGalleryImageDto,
  })
  async listAdminGallery(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Query() query: GatewayGalleryAdminQueryDto,
  ) {
    return gatewayCollectionEnvelope(
      await this.products.listGallery(
        request,
        params.id,
        false,
        query.includeDeleted,
      ),
      { profile: "unpaginated" },
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.gallery.add", {
    requestType: GatewayGalleryAddDto,
    responseType: GatewayGalleryImageDto,
  })
  async addImages(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayGalleryAddDto,
  ) {
    return gatewayCollectionEnvelope(
      await this.products.addImages(request, params.id, body),
      { profile: "unpaginated" },
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.gallery.order", {
    requestType: GatewayGalleryOrderDto,
    responseType: GatewayGalleryImageDto,
  })
  async reorderImages(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayGalleryOrderDto,
  ) {
    return gatewayCollectionEnvelope(
      await this.products.reorderImages(request, params.id, body),
      { profile: "unpaginated" },
      requestId(request),
    );
  }

  @GatewayApiRoute("admin.products.gallery.remove", {
    queryType: GatewayGalleryRemoveQueryDto,
    responseType: GatewayGalleryImageDto,
  })
  async removeImage(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayProductGalleryPathDto,
    @Query() query: GatewayGalleryRemoveQueryDto,
  ) {
    return gatewayCollectionEnvelope(
      await this.products.removeImage(
        request,
        params.id,
        params.imageId,
        query.hardDelete ?? false,
      ),
      { profile: "unpaginated" },
      requestId(request),
    );
  }
}
