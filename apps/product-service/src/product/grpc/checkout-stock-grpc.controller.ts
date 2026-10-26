import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { AllowedS2SCallers, InternalOnly, Public } from "@nebula/grpc-auth";
import { productv1 } from "@nebula/protos";
import { CheckoutStockService } from "../checkout-stock.service";

@Controller()
export class CheckoutStockGrpcController {
  constructor(private readonly stock: CheckoutStockService) {}

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("order-service")
  @GrpcMethod("ProductService", "ReserveCheckoutStock")
  async reserve(request: productv1.ReserveCheckoutStockRequest) {
    return productv1.CheckoutStockResponse.create(
      await this.stock.reserve(request),
    );
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("order-service")
  @GrpcMethod("ProductService", "FinalizeCheckoutStock")
  async finalize(request: productv1.CheckoutStockIdentity) {
    return productv1.CheckoutStockResponse.create(
      await this.stock.finalize(request),
    );
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("order-service")
  @GrpcMethod("ProductService", "CancelCheckoutStock")
  async cancel(request: productv1.CheckoutStockIdentity) {
    return productv1.CheckoutStockResponse.create(
      await this.stock.cancel(request),
    );
  }

  @Public()
  @InternalOnly()
  @AllowedS2SCallers("order-service")
  @GrpcMethod("ProductService", "RestoreCheckoutStock")
  async restore(request: productv1.CheckoutStockIdentity) {
    return productv1.CheckoutStockResponse.create(
      await this.stock.restore(request),
    );
  }
}
