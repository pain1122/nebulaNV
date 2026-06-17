# Order Service

Last reviewed: 2026-06-17

## Purpose

Order-service owns carts, checkout, order persistence, order item snapshots, and order status updates.

Order-service does not own product catalog data. It fetches product details from product-service when adding items to cart.

## Main Responsibilities

- Current user cart lookup.
- Add product to cart.
- Update cart item quantity.
- Remove cart item.
- Checkout cart into an order.
- List current user's orders.
- Get current user's order by ID.
- Admin order status update.
- DB-backed `/health`.

## Current HTTP Contract

Routes:

- `GET /orders/cart`
- `POST /orders/cart/items`
- `PATCH /orders/cart/items/:id`
- `DELETE /orders/cart/items/:id`
- `POST /orders/checkout`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`

Access:

- Cart, checkout, and user order reads require `user`.
- Status update requires `admin`.

Identity rule:

- HTTP user-owned operations resolve `userId` from authenticated request context.
- Do not accept or trust a body/query/path-supplied `userId` for current-user cart/order actions.

## Current gRPC Contract

Proto: `packages/protos/order.proto`

Service: `OrderService`

Methods:

- `GetCart`
- `AddToCart`
- `UpdateCartItem`
- `RemoveCartItem`
- `Checkout`
- `GetOrder`
- `ListOrders`
- `UpdateOrderStatus`
- `Ping`

Identity rule:

- User-owned gRPC operations use `@RequireUserId()` and resolve actor identity from guarded metadata/context.
- Request `userId` should not override the authenticated context user.

## Current DB Shape

Main Prisma models:

- `Cart`
- `CartItem`
- `Order`
- `OrderItem`

Enum:

- `OrderStatus = PENDING | PAID | FULFILLED | CANCELLED`

Money storage:

- Money is stored as Postgres decimal for precision.
- Display formatting, currency symbols, separators, locale, and rounding policy belong at the service/frontend presentation layer.
- Target formatting policy should be settings-service driven.

## Cart Rules

- One active cart per user.
- Expired carts are deleted and recreated.
- Cart TTL is configurable through settings-service key `order/cart_ttl_minutes`.
- Current code fallback is 30 minutes if settings lookup fails.
- Target launch default should be 6 hours.
- Adding the same product again increments quantity.

## Currency Rules

- Store currency policy should come from settings-service, not from individual cart items.
- Product-service may currently return `currency`, but order-service should treat settings-service as the source of shop currency policy.
- Cart/order currency should be one configured shop currency.
- If product data returns a different currency than the configured shop currency, that is an admin/data configuration error.
- Current code derives cart currency from product data and rejects later mismatches; this should be standardized to settings-service currency before launch.

## Checkout Rules

- Empty cart cannot checkout.
- Checkout creates an order plus order items inside a DB transaction.
- Order items snapshot product name, sku, quantity, and price at checkout time.
- Checkout deletes the cart and cart items after order creation.
- Order starts as `PENDING`.
- Checkout/payment finalization must never accept a body-supplied user ID.

## Service Relationships

Uses:

- Auth-service for token validation through `GrpcTokenAuthGuard`.
- Product-service for product lookup when adding cart items.
- Settings-service for cart TTL and target currency/display policy.
- Postgres via Prisma for cart/order persistence.

Does not currently use:

- User-service directly for cart/order ownership checks.
- Media-service directly.

Identity note:

- Actor identity comes from auth-service-validated token context.
- Cart/order ownership is enforced by matching rows to the authenticated `userId`.
- Payment/customer identity checks are future work and should be explicit at the checkout/payment boundary.

## Current Tests

HTTP:

- User can get cart.
- User can add product to cart.
- User can update cart item quantity.
- User can checkout and clear cart.
- User can list orders.
- User can get own order.
- Admin can update order status.

gRPC:

- GetCart returns empty cart for new user.
- AddToCart adds item.
- UpdateCartItem changes quantity.
- Checkout creates order and empties cart.
- ListOrders includes created order.
- GetOrder returns created order.
- UpdateOrderStatus changes status to `PAID`.

## Related Files

Core:

- `apps/order-service/src/order/order.service.ts`
- `apps/order-service/src/order/order.controller.ts`
- `apps/order-service/src/order/grpc/order-grpc.controller.ts`
- `apps/order-service/src/order/dto/order.dto.ts`
- `apps/order-service/src/order/order.module.ts`

Contracts:

- `packages/protos/order.proto`
- `packages/protos/product.proto`

Runtime:

- `apps/order-service/src/app.module.ts`
- `apps/order-service/src/main.ts`
- `apps/order-service/src/config/env.validation.ts`
- `apps/order-service/src/health.controller.ts`
- `apps/order-service/src/prisma.service.ts`
- `apps/order-service/prisma/schema.prisma`
- `apps/order-service/src/auth-client.module.ts`
- `apps/order-service/src/product-client.module.ts`
- `apps/order-service/src/settings-client.module.ts`

Tests:

- `apps/order-service/test/http/order.http.e2e.spec.ts`
- `apps/order-service/test/grpc/order.e2e.spec.ts`
- `apps/order-service/test/grpc/helpers.ts`
- `apps/order-service/test/setup/wait-for-services.ts`
- `apps/order-service/test/jest.env.ts`

## Known Gaps

- Currency policy is not fully standardized yet.
- Current code derives cart currency from product data; target behavior is settings-service-driven shop currency.
- Current cart TTL fallback is 30 minutes; target launch default should be 6 hours.
- gRPC `UpdateOrderStatus` needs stronger explicit admin enforcement review.
- gRPC tests pass admin S2S metadata for status update, but the controller currently does not visibly check admin role.
- Order response shape currently relies on Prisma-shaped service return objects; there is no dedicated order mapper yet.
- No payment flow exists yet; checkout only creates a `PENDING` order.
- Final payment/customer identity verification is not implemented yet.
- No inventory reservation/decrement exists yet.
