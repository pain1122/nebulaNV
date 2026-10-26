import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Metadata } from "@grpc/grpc-js";
import { randomUUID } from "node:crypto";
import { ImageMetadataDto } from "./dto/image-metadata.dto";
import { ProductServiceImpl } from "./product.service";
import {
  AUTHORIZATION_HEADER,
  firstHeaderValue,
  Public,
  Roles,
  type HttpRequestWithContext,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";
import { Throttle } from "@nestjs/throttler";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
  ListProductsRequestDto,
  ProductStatusDto,
} from "./dto/product-input.dto";

function authenticatedHttpDownstream(
  request: HttpRequestWithContext,
): VerifiedServiceDownstreamContext {
  const authorization = firstHeaderValue(
    request.headers?.[AUTHORIZATION_HEADER],
  );
  if (!authorization || !request.user?.userId) {
    throw new UnauthorizedException("verified_admin_context_missing");
  }
  const metadata = new Metadata();
  metadata.set(AUTHORIZATION_HEADER, authorization);
  return {
    metadata,
    signingPolicy: { requestId: request.requestId ?? randomUUID() },
  };
}

@Controller("products")
export class ProductController {
  constructor(private readonly svc: ProductServiceImpl) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  list(@Query() q: ListProductsRequestDto, @Req() req: HttpRequestWithContext) {
    // q is sanitized/coerced by ValidationPipe + DTO transforms
    const input = {
      q: q.q ?? "",
      categoryId: q.categoryId ?? "",
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    };
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "root-admin";
    return isAdmin
      ? this.svc.listAdmin({
          ...input,
          status: q.status ?? "",
          includeDeleted: !!q.includeDeleted,
        })
      : this.svc.listPublic(input);
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(":id")
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Req() req: HttpRequestWithContext,
  ) {
    const isAdmin =
      req.user?.role === "admin" || req.user?.role === "root-admin";
    return isAdmin ? this.svc.getAdmin(id) : this.svc.getPublic(id);
  }

  @Roles("admin", "root-admin")
  @Patch(":id/gallery/:imageId/metadata")
  async updateImageMetadata(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("imageId", new ParseUUIDPipe({ version: "4" })) imageId: string,
    @Body() input: ImageMetadataDto,
  ) {
    return { data: await this.svc.updateImageMetadata(id, imageId, input) };
  }

  @Roles("admin", "root-admin")
  @Post()
  create(
    @Body() body: CreateProductRequestDto,
    @Req() request: HttpRequestWithContext,
  ) {
    return this.svc.create(
      body.data,
      body.data.thumbnailMediaId ||
        body.data.brandId ||
        body.data.tagIds?.length
        ? authenticatedHttpDownstream(request)
        : undefined,
    );
  }

  @Roles("admin", "root-admin")
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: UpdateProductRequestDto,
    @Req() request: HttpRequestWithContext,
  ) {
    return this.svc.update(
      id,
      body.patch,
      body.expectedVersion,
      body.patch?.status === ProductStatusDto.ACTIVE ||
        body.patch?.thumbnailMediaId ||
        body.patch?.brandId ||
        body.patch?.tagIds?.length
        ? authenticatedHttpDownstream(request)
        : undefined,
    );
  }
}
