import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  OnModuleInit,
} from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { PrismaService } from "../prisma.service";
import { OrderStatus } from "../../prisma/generated/client";
import { AddToCartDto, UpdateCartItemDto } from "./dto/order.dto";
import { PRODUCT_SERVICE } from "../product-client.module";
import { SETTINGS_SERVICE } from "../settings-client.module";
import {
  getProduct,
  getSettings,
  type ProductProxy,
  type SettingsProxy,
} from "@nebula/clients";
import {
  wrapGrpc,
  type VerifiedServiceDownstreamContext,
} from "@nebula/grpc-auth";

type PriceLike = number | string | { toString(): string } | null | undefined;

type ProductPayload = {
  id?: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  sku?: string | null;
  price?: PriceLike;
  currency?: string | null;
};

type ProductGrpcResponse = ProductPayload & {
  data?: ProductPayload;
  product?: ProductPayload;
};

type ProductRecord = {
  id: string;
  name: string;
  sku?: string | null;
  price: PriceLike;
  currency?: string | null;
};

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

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientGrpc,
    @Inject(SETTINGS_SERVICE) private readonly settingsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.productSvc = getProduct(this.productClient);
    this.settingsSvc = getSettings(this.settingsClient);
  }

  // --------- Helpers ---------

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
  ): Promise<ProductRecord> {
    const request = { id: productId };
    const res = await wrapGrpc(
      firstValueFrom(
        this.product(downstream).GetProduct(request, downstream?.metadata),
      ),
    );

    // product-service typically returns: { data: { id, slug, title, sku, price, currency, ... } }
    const productResponse = res as unknown as ProductGrpcResponse;
    const raw =
      productResponse.data ?? productResponse.product ?? productResponse;

    if (!raw || !raw.id) {
      throw new NotFoundException("product_not_found");
    }

    const name =
      raw.name ??
      raw.title ?? // Product.title from product-service
      raw.slug ??
      "Product";

    return {
      id: raw.id,
      name,
      sku: raw.sku ?? null,
      price: raw.price,
      currency: raw.currency ?? null,
    };
  }

  // Decimal-safe normalization
  private normalizePrice(price: PriceLike): number {
    if (price == null) return 0;

    // Prisma Decimal / objects with toString()
    if (typeof price === "object" && typeof price.toString === "function") {
      const n = Number(price.toString());
      return Number.isFinite(n) ? n : 0;
    }

    if (typeof price === "number") return price;

    const n = Number(price);
    return Number.isFinite(n) ? n : 0;
  }

  // TTL is stored in settings: namespace=order, key=cart_ttl, JSON { minutes: 30 }
  private async getCartTtlMs(
    downstream?: VerifiedServiceDownstreamContext,
  ): Promise<number> {
    if (this.cartTtlMsCache != null) return this.cartTtlMsCache;

    try {
      const res = await firstValueFrom(
        this.settings(downstream).GetString(
          {
            namespace: "order",
            key: "cart_ttl_minutes",
            environment: "default",
          },
          downstream?.metadata,
        ),
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

  // --------- Cart helpers ---------

  private async getActiveCart(
    userId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const now = new Date();

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (cart && cart.expiresAt && cart.expiresAt <= now) {
      await this.prisma.cart.delete({ where: { id: cart.id } });
      cart = null;
    }

    if (!cart) {
      const ttlMs = await this.getCartTtlMs(downstream);

      cart = await this.prisma.cart.create({
        data: {
          userId,
          // currency will be updated from first product added
          currency: "USD",
          expiresAt: new Date(now.getTime() + ttlMs),
        },
        include: { items: true },
      });
    }

    return cart;
  }

  private async bumpCartExpiry(
    cartId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const ttlMs = await this.getCartTtlMs(downstream);
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: new Date(Date.now() + ttlMs) },
    });
  }

  // --------- Cart API ---------

  async getCartForUser(
    userId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const cart = await this.getActiveCart(userId, downstream);
    return { data: cart };
  }

  async addToCart(
    userId: string,
    dto: AddToCartDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const cart = await this.getActiveCart(userId, downstream);

    // 🔗 fetch price + currency from product-service
    const prod = await this.fetchProductOrThrow(dto.productId, downstream);
    const unitPrice = this.normalizePrice(prod.price);
    const currency = prod.currency || "EUR";

    // ensure currency consistency inside a cart
    if (cart.items.length > 0 && cart.currency !== currency) {
      throw new BadRequestException("cart_currency_mismatch");
    }

    // first item decides cart currency
    if (cart.items.length === 0 && cart.currency !== currency) {
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: { currency },
      });
      cart.currency = currency;
    }

    const existing = cart.items.find((i) => i.productId === dto.productId);

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + dto.quantity,
          name: prod.name,
          sku: prod.sku ?? undefined,
          unitPrice,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          name: prod.name,
          sku: prod.sku ?? undefined,
          quantity: dto.quantity,
          unitPrice,
        },
      });
    }

    await this.bumpCartExpiry(cart.id, downstream);

    const updated = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return { data: updated };
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const cart = await this.getActiveCart(userId, downstream);

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("cart_item_not_found");

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    await this.bumpCartExpiry(cart.id, downstream);

    const updated = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return { data: updated };
  }

  async removeCartItem(
    userId: string,
    itemId: string,
    downstream?: VerifiedServiceDownstreamContext,
  ) {
    const cart = await this.getActiveCart(userId, downstream);

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException("cart_item_not_found");

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    await this.bumpCartExpiry(cart.id, downstream);

    const updated = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    return { data: updated };
  }

  // --------- Checkout / Orders ---------

  private generateOrderNumber(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(Math.random() * 10_000)
      .toString()
      .padStart(4, "0");
    return `ORD-${y}${m}${d}-${rand}`;
  }

  async checkout(userId: string, note?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("cart_empty");
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + this.normalizePrice(item.unitPrice) * item.quantity;
    }, 0);

    const discountTotal = 0;
    const taxTotal = 0;
    const total = subtotal - discountTotal + taxTotal;

    const orderNumber = this.generateOrderNumber();

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: cart.userId,
          status: OrderStatus.PENDING,
          currency: cart.currency,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          meta: note ? { note } : undefined,
        },
      });

      for (const item of cart.items) {
        const lineTotal = this.normalizePrice(item.unitPrice) * item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.delete({ where: { id: cart.id } });

      return order;
    });

    const withItems = await this.prisma.order.findUnique({
      where: { id: created.id },
      include: { items: true },
    });

    return { data: withItems };
  }

  async listOrdersForUser(userId: string, status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return { data: orders };
  }

  async getOrderForUser(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException("order_not_found");
    return { data: order };
  }

  async updateOrderStatusAdmin(id: string, status: OrderStatus) {
    try {
      const order = await this.prisma.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      return { data: order };
    } catch (error: unknown) {
      if (hasPrismaCode(error, "P2025")) {
        throw new NotFoundException("order_not_found");
      }

      throw error;
    }
  }
}
