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
} from "@nestjs/common";
import { ProductServiceImpl } from "./product.service";
import { Public, Roles, type HttpRequestWithContext } from "@nebula/grpc-auth";
import { Throttle } from "@nestjs/throttler";
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
  ListProductsRequestDto,
} from "./dto/product-input.dto";

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
  @Post()
  create(@Body() body: CreateProductRequestDto) {
    return this.svc.create(body.data);
  }

  @Roles("admin", "root-admin")
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: UpdateProductRequestDto,
  ) {
    return this.svc.update(id, body.patch);
  }
}
