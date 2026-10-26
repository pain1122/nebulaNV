import {
  applyOrderStatus,
  type OrderStatusCommand,
  type OrderStatusActor,
} from "./order-status";
import { OrderCancellationCoordinator } from "./order-cancellation";
import { DemoPaymentCoordinator } from "./demo-payment";
import {
  demoRetryStock,
  type DemoStartInput,
  type DemoOutcomeInput,
} from "./demo-payment-contract";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  OnModuleInit,
  ServiceUnavailableException,
  ConflictException,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { status as grpcStatus } from "@grpc/grpc-js";
import { firstValueFrom, timeout, TimeoutError, type Observable } from "rxjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma.service";
import { Prisma, OrderStatus } from "../../prisma/generated/client";
import { AddToCartDto, UpdateCartItemDto } from "./dto/order.dto";
import { PRODUCT_SERVICE } from "../product-client.module";
import { SETTINGS_SERVICE } from "../settings-client.module";
import {
  getProduct,
  getSettings,
  type CheckoutStockFacts,
  type ProductProxy,
  type SettingsProxy,
} from "@nebula/clients";
import {
  fromRpcToHttp,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";

import {
  cartId,
  cartQuantity,
  cartQuote,
  checkCartStock,
  cartReply,
  boundedMoney,
  type CartProduct,
  type StoredCart,
} from "./cart-contract";
import { capturedCart, orderReply, stableFacts } from "./checkout-contract";
import {
  adminOrderId,
  adminOrderQuery,
  VISIBLE_ORDER,
  type AdminOrderQuery,
} from "./order-admin-read";
import { checkoutHash, checkoutIntent } from "./checkout-receipt";
import {
  CheckoutCoordinator,
  type PreparedCheckout,
} from "./checkout-coordinator";
import {
  ACTIVE_CHECKOUT_STATES,
  CHECKOUT_RPC_MS,
  type CheckoutPayload,
} from "./checkout-attempt-contract";

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

@Injectable()
export class OrderService implements OnModuleInit {
  private productSvc!: ProductProxy;
  private settingsSvc!: SettingsProxy;
  private cartTtlMsCache: number | null = null;
  private readonly coordinator: CheckoutCoordinator;
  private readonly cancellation: OrderCancellationCoordinator;
  private readonly demoPayments: DemoPaymentCoordinator;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
  ) {
    this.demoPayments = new DemoPaymentCoordinator(prisma, {
      quote: async (order, context) => {
        const currency = await this.getShopCurrency(context);
        const products = new Map<string, CartProduct>();
        try {
          for (const item of order.items)
            if (!products.has(item.productId))
              products.set(
                item.productId,
                await this.fetchProductOrThrow(item.productId, context),
              );
          return demoRetryStock(order, products, currency);
        } catch (error) {
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException
          )
            throw new ConflictException("demo_payment_selection_changed", {
              cause: error,
            });
          throw error;
        }
      },
      reserve: (request, context) =>
        this.stockResponse(
          this.product(context).ReserveCheckoutStock(
            request,
            context?.metadata,
            { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
          ),
        ),
      finalize: (request, context) =>
        this.stockResponse(
          this.product(context).FinalizeCheckoutStock(
            request,
            context?.metadata,
            { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
          ),
        ),
      cancel: (request, context) =>
        this.stockResponse(
          this.product(context).CancelCheckoutStock(
            request,
            context?.metadata,
            { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
          ),
        ),
      restore: (request, context) =>
        this.stockResponse(
          this.product(context).RestoreCheckoutStock(
            request,
            context?.metadata,
            { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
          ),
        ),
    });
    this.cancellation = new OrderCancellationCoordinator(
      prisma,
      (request, context) =>
        this.stockResponse(
          this.product(context).RestoreCheckoutStock(
            request,
            context?.metadata,
            {
              deadline: new Date(Date.now() + CHECKOUT_RPC_MS),
            },
          ),
        ),
    );
    this.coordinator = new CheckoutCoordinator(
      prisma,
      (userId, work) => this.cartTransaction(userId, work, true),
      {
        reserve: async (request, context) =>
          this.reserveStockResponse(
            this.product(context).ReserveCheckoutStock(
              request,
              context?.metadata,
              {
                deadline: new Date(Date.now() + CHECKOUT_RPC_MS),
              },
            ),
          ),
        finalize: async (request, context) =>
          this.stockResponse(
            this.product(context).FinalizeCheckoutStock(
              request,
              context?.metadata,
              {
                deadline: new Date(Date.now() + CHECKOUT_RPC_MS),
              },
            ),
          ),
        cancel: async (request, context) =>
          this.stockResponse(
            this.product(context).CancelCheckoutStock(
              request,
              context?.metadata,
              {
                deadline: new Date(Date.now() + CHECKOUT_RPC_MS),
              },
            ),
          ),
      },
    );
  }

  onModuleInit() {
    this.productSvc = getProduct(this.productClient);
    this.settingsSvc = getSettings(this.settingsClient);
  }

  // --------- Helpers ---------

  private async stockResponse<T>(response: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(response.pipe(timeout(CHECKOUT_RPC_MS)));
    } catch (error) {
      if (error instanceof TimeoutError)
        throw new ServiceUnavailableException("checkout_stock_timeout", {
          cause: error,
        });
      return fromRpcToHttp(error);
    }
  }

  private async readResponse<T>(
    response: Observable<T>,
    dependency: "product" | "settings",
  ): Promise<T> {
    try {
      return await firstValueFrom(response.pipe(timeout(CHECKOUT_RPC_MS)));
    } catch (error) {
      if (
        error instanceof TimeoutError ||
        (typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === grpcStatus.DEADLINE_EXCEEDED)
      )
        throw new ServiceUnavailableException(`${dependency}_unavailable`, {
          cause: error,
        });
      return fromRpcToHttp(error);
    }
  }

  private async reserveStockResponse<T>(response: Observable<T>): Promise<T> {
    try {
      return await this.stockResponse(response);
    } catch (error) {
      // Publication/stock can disappear between the quote and reservation.
      if (error instanceof NotFoundException)
        throw new ConflictException("checkout_selection_changed", {
          cause: error,
        });
      throw error;
    }
  }

  private product(downstream?: VerifiedServiceDownstreamContext): ProductProxy {
    return downstream
      ? getProduct(this.productClient, downstream.signingPolicy)
      : this.productSvc;
  }

  private settings(
    downstream?: VerifiedServiceDownstreamContext,
  ): SettingsProxy {
    return downstream
      ? getSettings(this.settingsClient, downstream.signingPolicy)
      : this.settingsSvc;
  }

  private async fetchProductOrThrow(
    productId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<CartProduct> {
    const response = await this.readResponse(
      this.product(downstream).GetProduct(
        { id: productId },
        downstream?.metadata,
        { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
      ),
      "product",
    );
    if (!response?.data?.id) throw new NotFoundException("product_not_found");
    return response.data;
  }

  private async getShopCurrency(
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<string> {
    const result = await this.readResponse(
      this.settings(downstream).GetString(
        {
          namespace: "pricing",
          environment: "default",
          key: "default_currency",
        },
        downstream?.metadata,
        { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
      ),
      "settings",
    );
    const currency =
      result?.found && typeof result.value === "string"
        ? result.value.trim().toUpperCase()
        : "";
    if (!/^[A-Z]{3,8}$/.test(currency)) {
      throw new ServiceUnavailableException("shop_currency_not_configured");
    }
    return currency;
  }

  // Existing Settings minutes value and intentional 30-minute fallback.
  private async getCartTtlMs(
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<number> {
    if (this.cartTtlMsCache != null) return this.cartTtlMsCache;

    try {
      const res = await this.readResponse(
        this.settings(downstream).GetString(
          {
            namespace: "order",
            key: "cart_ttl_minutes",
            environment: "default",
          },
          downstream?.metadata,
          { deadline: new Date(Date.now() + CHECKOUT_RPC_MS) },
        ),
        "settings",
      );

      const minutes = res.value || 30;

      const ms = Number(minutes) * 60_000;
      this.cartTtlMsCache = Number.isFinite(ms) && ms > 0 ? ms : 30 * 60_000;
      return this.cartTtlMsCache;
    } catch {
      this.cartTtlMsCache = 30 * 60_000;
      return this.cartTtlMsCache;
    }
  }

  // Network authority is fetched before this short, owner-scoped local lock.
  private async cartTransaction<T>(
    userId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    checkoutWork = false,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"nebula-cart:" + userId}, 0))::text`;
          if (
            !checkoutWork &&
            (await tx.checkoutAttempt.findFirst({
              where: { userId, state: { in: [...ACTIVE_CHECKOUT_STATES] } },
            }))
          ) {
            throw new ConflictException("checkout_in_progress");
          }
          return work(tx);
        },
        { maxWait: 5000, timeout: 10000 },
      );
    } catch (error: unknown) {
      if (hasPrismaCode(error, "P2028") || hasPrismaCode(error, "P2034")) {
        throw new ConflictException("cart_write_conflict");
      }
      throw error;
    }
  }

  private readCart(tx: Prisma.TransactionClient, userId: string) {
    return tx.cart.findUnique({ where: { userId }, include: { items: true } });
  }

  private expired(cart: StoredCart): boolean {
    return !!cart.expiresAt && cart.expiresAt.getTime() <= Date.now();
  }

  private async activeCart(
    tx: Prisma.TransactionClient,
    userId: string,
    currency: string,
    ttl: number,
  ) {
    let cart = await this.readCart(tx, userId);
    if (cart && this.expired(cart)) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.delete({ where: { id: cart.id } });
      cart = null;
    }
    if (cart && !cart.expiresAt) {
      return tx.cart.update({
        where: { id: cart.id },
        data: { expiresAt: new Date(Date.now() + ttl) },
        include: { items: true },
      });
    }
    return (
      cart ??
      tx.cart.create({
        data: { userId, currency, expiresAt: new Date(Date.now() + ttl) },
        include: { items: true },
      })
    );
  }

  private async renewedReply(
    tx: Prisma.TransactionClient,
    cartId: string,
    ttl: number,
  ) {
    const cart = await tx.cart.update({
      where: { id: cartId },
      data: { expiresAt: new Date(Date.now() + ttl) },
      include: { items: true },
    });
    // Bounds are checked inside the transaction so overflow rolls back writes.
    return { data: cartReply(cart) };
  }

  private selectionData(quote: ReturnType<typeof cartQuote>) {
    return {
      productId: quote.productId,
      variantId: quote.variantId,
      selectionKey: quote.selectionKey,
      selectedOptions: quote.selectedOptions,
      name: quote.name,
      sku: quote.sku,
      unitPrice: quote.unitPrice,
    };
  }

  async getCartForUser(
    userId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const existing = await this.readCart(this.prisma, userId);
    if (existing?.expiresAt && !this.expired(existing))
      return { data: cartReply(existing) };
    const [currency, ttl] = await Promise.all([
      this.getShopCurrency(downstream),
      this.getCartTtlMs(downstream),
    ]);
    return this.cartTransaction(userId, async (tx) => ({
      data: cartReply(await this.activeCart(tx, userId, currency, ttl)),
    }));
  }

  async addToCart(
    userId: string,
    dto: AddToCartDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    cartId(dto.productId, "product_id");
    if (dto.variantId !== undefined) cartId(dto.variantId, "variant_id");
    cartQuantity(dto.quantity);
    const productId = dto.productId.toLowerCase();
    const variantId = dto.variantId?.toLowerCase();
    const [product, currency, ttl] = await Promise.all([
      this.fetchProductOrThrow(productId, downstream),
      this.getShopCurrency(downstream),
      this.getCartTtlMs(downstream),
    ]);
    const quote = cartQuote(product, productId, variantId, currency);
    return this.cartTransaction(userId, async (tx) => {
      const cart = await this.activeCart(tx, userId, currency, ttl);
      if (cart.items.length && cart.currency !== currency)
        throw new BadRequestException("cart_currency_mismatch");
      if (cart.currency !== currency)
        await tx.cart.update({ where: { id: cart.id }, data: { currency } });
      const existing = cart.items.find(
        (item) => item.selectionKey === quote.selectionKey,
      );
      const quantity = (existing?.quantity ?? 0) + dto.quantity;
      checkCartStock(quote, quantity);
      const facts = this.selectionData(quote);
      if (existing)
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { ...facts, quantity },
        });
      else
        await tx.cartItem.create({
          data: { cartId: cart.id, ...facts, quantity },
        });
      return this.renewedReply(tx, cart.id, ttl);
    });
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    cartId(itemId, "cart_item_id");
    itemId = itemId.toLowerCase();
    cartQuantity(dto.quantity, true);
    if (dto.quantity === 0)
      return this.removeCartItem(userId, itemId, downstream);
    const before = await this.readCart(this.prisma, userId);
    const item =
      before && !this.expired(before)
        ? before.items.find((entry) => entry.id === itemId)
        : undefined;
    if (!item) throw new NotFoundException("cart_item_not_found");
    const [product, currency, ttl] = await Promise.all([
      this.fetchProductOrThrow(item.productId, downstream),
      this.getShopCurrency(downstream),
      this.getCartTtlMs(downstream),
    ]);
    const quote = cartQuote(
      product,
      item.productId,
      item.variantId ?? undefined,
      currency,
    );
    checkCartStock(quote, dto.quantity);
    return this.cartTransaction(userId, async (tx) => {
      const cart = await this.readCart(tx, userId);
      const owned =
        cart && !this.expired(cart)
          ? cart.items.find((entry) => entry.id === itemId)
          : undefined;
      if (!cart || !owned) throw new NotFoundException("cart_item_not_found");
      if (cart.currency !== currency)
        throw new BadRequestException("cart_currency_mismatch");
      if (owned.selectionKey !== quote.selectionKey)
        throw new ConflictException("cart_selection_changed");
      const facts = this.selectionData(quote);
      await tx.cartItem.update({
        where: { id: itemId },
        data: { ...facts, quantity: dto.quantity },
      });
      return this.renewedReply(tx, cart.id, ttl);
    });
  }

  async removeCartItem(
    userId: string,
    itemId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    cartId(itemId, "cart_item_id");
    itemId = itemId.toLowerCase();
    const ttl = await this.getCartTtlMs(downstream);
    return this.cartTransaction(userId, async (tx) => {
      const cart = await this.readCart(tx, userId);
      if (
        !cart ||
        this.expired(cart) ||
        !cart.items.some((item) => item.id === itemId)
      )
        throw new NotFoundException("cart_item_not_found");
      await tx.cartItem.delete({ where: { id: itemId } });
      return this.renewedReply(tx, cart.id, ttl);
    });
  }

  // --------- Checkout / Orders ---------

  private generateOrderNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = randomUUID();
    return `ORD-${y}${m}${d}-${rand}`;
  }

  async checkout(
    userId: string,
    idempotencyKey: unknown,
    note?: string | null,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const { keyHash, intentHash } = checkoutIntent(idempotencyKey, note);
    return this.coordinator.checkout(
      userId,
      keyHash,
      intentHash,
      () => this.prepareCheckout(userId, note, downstream),
      downstream,
    );
  }

  private async prepareCheckout(
    userId: string,
    note: string | null | undefined,
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<PreparedCheckout> {
    const currency = await this.getShopCurrency(downstream);
    const captured = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    if (!captured || this.expired(captured) || !captured.items.length)
      throw new BadRequestException("cart_empty");
    if (captured.currency !== currency)
      throw new ConflictException("cart_currency_mismatch");
    if (captured.items.length > 100)
      throw new BadRequestException("checkout_selection_limit");
    const fingerprint = capturedCart(captured);
    const products = new Map<string, CartProduct>();
    const snapshots: CheckoutPayload["items"] = [];
    const stockLines: CheckoutStockFacts["lines"] = [];
    for (const item of captured.items) {
      try {
        if (!products.has(item.productId))
          products.set(
            item.productId,
            await this.fetchProductOrThrow(item.productId, downstream),
          );
        const quote = cartQuote(
          products.get(item.productId)!,
          item.productId,
          item.variantId ?? undefined,
          currency,
        );
        checkCartStock(quote, item.quantity);
        const version = products.get(item.productId)?.version;
        if (
          typeof version !== "number" ||
          !Number.isInteger(version) ||
          version < 1 ||
          version >= 2147483647
        )
          throw new ServiceUnavailableException(
            "product_version_contract_invalid",
          );
        if (
          !quote.unitPrice.equals(item.unitPrice) ||
          quote.sku !== item.sku ||
          quote.selectionKey !== item.selectionKey ||
          stableFacts(quote.selectedOptions) !==
            stableFacts(item.selectedOptions)
        )
          throw new ConflictException("checkout_selection_changed");
        snapshots.push({
          productId: quote.productId,
          variantId: quote.variantId,
          selectedOptions: quote.selectedOptions,
          sku: quote.sku,
          name: quote.name,
          quantity: item.quantity,
          unitPrice: quote.unitPrice.toFixed(2),
          lineTotal: boundedMoney(quote.unitPrice.mul(item.quantity)).toFixed(
            2,
          ),
        });
        stockLines.push({
          productId: quote.productId,
          variantId: quote.variantId ?? "",
          selectedOptions: quote.selectedOptions,
          quantity: item.quantity,
          expectedVersion: version,
          sku: quote.sku,
          unitPrice: quote.unitPrice.toFixed(2),
        });
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        )
          throw new ConflictException("checkout_selection_changed", {
            cause: error,
          });
        throw error;
      }
    }
    const totals = cartReply(captured);
    return {
      cartId: captured.id,
      cartFingerprint: checkoutHash(fingerprint),
      payload: {
        orderNumber: this.generateOrderNumber(),
        note: note ?? "",
        currency,
        subtotal: totals.subtotal,
        total: totals.total,
        stock: { currency, lines: stockLines },
        items: snapshots,
      },
    };
  }

  recoverCheckouts() {
    return this.coordinator.recover();
  }

  recoverOrderCancellations() {
    return this.cancellation.recover();
  }

  recoverDemoPayments() {
    return this.demoPayments.recover();
  }
  startDemoPayment(
    id: string,
    input: DemoStartInput,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    return this.demoPayments.start(id, input, key, actor, context);
  }
  resolveDemoPayment(
    id: string,
    input: DemoOutcomeInput,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    return this.demoPayments.resolve(id, input, key, actor, context);
  }

  async listOrdersForUser(userId: string, status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        OR: [
          { checkoutAttempt: { is: null } },
          { checkoutAttempt: { is: { state: "COMPLETED" } } },
        ],
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return { data: orders.map(orderReply) };
  }

  async getOrderForUser(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        userId,
        OR: [
          { checkoutAttempt: { is: null } },
          { checkoutAttempt: { is: { state: "COMPLETED" } } },
        ],
      },
      include: { items: true },
    });

    if (!order) throw new NotFoundException("order_not_found");
    return { data: orderReply(order) };
  }

  updateOrderStatusAdmin(
    id: string,
    input: OrderStatusCommand,
    key: unknown,
    actor: OrderStatusActor,
    context?: VerifiedServiceDownstreamContext,
  ) {
    if (input?.status === "CANCELLED")
      return this.cancellation.cancel(id, input, key, actor, context);
    return applyOrderStatus(this.prisma, id, input, key, actor);
  }

  async getOrderForAdmin(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: adminOrderId(id), ...VISIBLE_ORDER },
      include: { items: true },
    });
    if (!order) throw new NotFoundException("order_not_found");
    return { data: orderReply(order) };
  }

  async listOrdersForAdmin(input: AdminOrderQuery = {}) {
    const { page, limit, status, userId } = adminOrderQuery(input);
    const where: Prisma.OrderWhereInput = {
      ...VISIBLE_ORDER,
      ...(status === undefined ? {} : { status }),
      ...(userId === undefined ? {} : { userId }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const [orders, total] = await Promise.all([
          tx.order.findMany({
            where,
            include: { items: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
          }),
          tx.order.count({ where }),
        ]);
        return { data: orders.map(orderReply), page, limit, total };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }
}
