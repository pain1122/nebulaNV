import { Body, Controller, Param, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { gatewayCollectionEnvelope, gatewayItemEnvelope } from "../contracts/api-envelope";
import { GatewayUuidPathDto } from "../contracts/common-api.dto";
import { GatewayApiRoute } from "../contracts/gateway-api-route.decorator";
import type { GatewayHttpRequest } from "../http/public-client-boundary";
import { GatewayOrderApiService } from "./gateway-order-api.service";
import {
  GatewayCartAddDto,
  GatewayCartDto,
  GatewayCartUpdateDto,
  GatewayCheckoutDto,
  GatewayOrderDto,
  GatewayOrderListQueryDto,
  GatewayOrderStatusUpdateDto,
} from "./order-api.dto";

function requestId(request: GatewayHttpRequest): string {
  const value = request.requestContext?.requestId;
  if (!value) throw new Error("gateway_request_context_missing");
  return value;
}

@ApiTags("Orders")
@Controller()
export class GatewayOrderController {
  constructor(private readonly orders: GatewayOrderApiService) {}

  @GatewayApiRoute("orders.cart.get", { responseType: GatewayCartDto })
  async getCart(@Req() request: GatewayHttpRequest) {
    return gatewayItemEnvelope(await this.orders.getCart(request), requestId(request));
  }

  @GatewayApiRoute("orders.cart.add", { requestType: GatewayCartAddDto, responseType: GatewayCartDto })
  async addCartItem(@Req() request: GatewayHttpRequest, @Body() body: GatewayCartAddDto) {
    return gatewayItemEnvelope(await this.orders.addToCart(request, body), requestId(request));
  }

  @GatewayApiRoute("orders.cart.update", { requestType: GatewayCartUpdateDto, responseType: GatewayCartDto })
  async updateCartItem(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayCartUpdateDto,
  ) {
    return gatewayItemEnvelope(await this.orders.updateCartItem(request, params.id, body), requestId(request));
  }

  @GatewayApiRoute("orders.cart.remove", { responseType: GatewayCartDto })
  async removeCartItem(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayItemEnvelope(await this.orders.removeCartItem(request, params.id), requestId(request));
  }

  @GatewayApiRoute("orders.checkout", { requestType: GatewayCheckoutDto, requestRequired: false, responseType: GatewayOrderDto })
  async checkout(@Req() request: GatewayHttpRequest, @Body() body: GatewayCheckoutDto) {
    return gatewayItemEnvelope(await this.orders.checkout(request, body), requestId(request));
  }

  @GatewayApiRoute("orders.list", { queryType: GatewayOrderListQueryDto, responseType: GatewayOrderDto })
  async list(@Req() request: GatewayHttpRequest, @Query() query: GatewayOrderListQueryDto) {
    return gatewayCollectionEnvelope(await this.orders.list(request, query), { profile: "unpaginated" }, requestId(request));
  }

  @GatewayApiRoute("orders.get", { responseType: GatewayOrderDto })
  async get(@Req() request: GatewayHttpRequest, @Param() params: GatewayUuidPathDto) {
    return gatewayItemEnvelope(await this.orders.get(request, params.id), requestId(request));
  }

  @GatewayApiRoute("admin.orders.status", { requestType: GatewayOrderStatusUpdateDto, responseType: GatewayOrderDto })
  async updateStatus(
    @Req() request: GatewayHttpRequest,
    @Param() params: GatewayUuidPathDto,
    @Body() body: GatewayOrderStatusUpdateDto,
  ) {
    return gatewayItemEnvelope(await this.orders.updateStatus(request, params.id, body.status), requestId(request));
  }
}
