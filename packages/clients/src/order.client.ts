import type { ClientGrpc } from "@nestjs/microservices";
import { ORDER_SERVICE_TARGET } from "@nebula/grpc-auth";
import { orderv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type Raw = {
  GetCart: RawGrpcUnary<orderv1.GetCartRequest, orderv1.CartResponse>;
  AddToCart: RawGrpcUnary<orderv1.AddToCartRequest, orderv1.CartResponse>;
  UpdateCartItem: RawGrpcUnary<
    orderv1.UpdateCartItemRequest,
    orderv1.CartResponse
  >;
  RemoveCartItem: RawGrpcUnary<
    orderv1.RemoveCartItemRequest,
    orderv1.CartResponse
  >;
  Checkout: RawGrpcUnary<orderv1.CheckoutRequest, orderv1.OrderResponse>;
  GetOrder: RawGrpcUnary<orderv1.GetOrderRequest, orderv1.OrderResponse>;
  ListOrders: RawGrpcUnary<
    orderv1.ListOrdersRequest,
    orderv1.ListOrdersResponse
  >;
  UpdateOrderStatus: RawGrpcUnary<
    orderv1.UpdateOrderStatusRequest,
    orderv1.OrderResponse
  >;
};

export interface OrderProxy {
  GetCart: SignedGrpcUnary<orderv1.GetCartRequest, orderv1.CartResponse>;
  AddToCart: SignedGrpcUnary<orderv1.AddToCartRequest, orderv1.CartResponse>;
  UpdateCartItem: SignedGrpcUnary<
    orderv1.UpdateCartItemRequest,
    orderv1.CartResponse
  >;
  RemoveCartItem: SignedGrpcUnary<
    orderv1.RemoveCartItemRequest,
    orderv1.CartResponse
  >;
  Checkout: SignedGrpcUnary<orderv1.CheckoutRequest, orderv1.OrderResponse>;
  GetOrder: SignedGrpcUnary<orderv1.GetOrderRequest, orderv1.OrderResponse>;
  ListOrders: SignedGrpcUnary<
    orderv1.ListOrdersRequest,
    orderv1.ListOrdersResponse
  >;
  UpdateOrderStatus: SignedGrpcUnary<
    orderv1.UpdateOrderStatusRequest,
    orderv1.OrderResponse
  >;
}

export function getOrder(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): OrderProxy {
  const raw = client.getService<Raw>("OrderService");
  const common = { policy: signingPolicy, target: ORDER_SERVICE_TARGET };
  return {
    GetCart: createSignedGrpcUnary({
      ...common,
      method: raw.GetCart.bind(raw),
      definition: orderv1.OrderServiceService.getCart,
    }),
    AddToCart: createSignedGrpcUnary({
      ...common,
      method: raw.AddToCart.bind(raw),
      definition: orderv1.OrderServiceService.addToCart,
    }),
    UpdateCartItem: createSignedGrpcUnary({
      ...common,
      method: raw.UpdateCartItem.bind(raw),
      definition: orderv1.OrderServiceService.updateCartItem,
    }),
    RemoveCartItem: createSignedGrpcUnary({
      ...common,
      method: raw.RemoveCartItem.bind(raw),
      definition: orderv1.OrderServiceService.removeCartItem,
    }),
    Checkout: createSignedGrpcUnary({
      ...common,
      method: raw.Checkout.bind(raw),
      definition: orderv1.OrderServiceService.checkout,
    }),
    GetOrder: createSignedGrpcUnary({
      ...common,
      method: raw.GetOrder.bind(raw),
      definition: orderv1.OrderServiceService.getOrder,
    }),
    ListOrders: createSignedGrpcUnary({
      ...common,
      method: raw.ListOrders.bind(raw),
      definition: orderv1.OrderServiceService.listOrders,
    }),
    UpdateOrderStatus: createSignedGrpcUnary({
      ...common,
      method: raw.UpdateOrderStatus.bind(raw),
      definition: orderv1.OrderServiceService.updateOrderStatus,
    }),
  };
}
