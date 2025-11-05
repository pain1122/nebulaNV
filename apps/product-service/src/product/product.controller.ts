import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from "@nestjs/common"
import { ProductServiceImpl } from "./product.service"
import { Public, Roles } from "@nebula/grpc-auth"
import { Throttle } from "@nestjs/throttler"
import {
  CreateProductRequestDto,
  UpdateProductRequestDto,
  ListProductsRequestDto,
} from "./dto/product-input.dto"

const Pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
})

@Controller("products")
@UsePipes(Pipe)
export class ProductController {
  constructor(private readonly svc: ProductServiceImpl) {}

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get()
  list(@Query() q: ListProductsRequestDto) {
    // q is sanitized/coerced by ValidationPipe + DTO transforms
    return this.svc.list({
      q: q.q ?? "",
      categoryId: q.categoryId ?? "",
      status: q.status ?? "",
      page: q.page ?? 1,
      limit: q.limit ?? 20,
      includeDeleted: !!q.includeDeleted,
    })
  }

  @Public()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Get(":id")
  get(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string) {
    return this.svc.get(id)
  }

  @Roles("admin")
  @Post()
  create(@Body() body: CreateProductRequestDto) {
    return this.svc.create(body.data)
  }

  @Roles("admin")
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: UpdateProductRequestDto,
  ) {
    return this.svc.update(id, body.patch)
  }
}
