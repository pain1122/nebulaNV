import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CheckoutStockState,
  Prisma,
  type CheckoutStockIntent,
} from "../../prisma/generated";
import { PrismaService } from "../prisma.service";
import { ProductServiceImpl } from "./product.service";
import {
  stockIdentity,
  stockReservation,
  STOCK_INT_MAX,
} from "./checkout-stock-contract";
import { effectiveProductPrice } from "./product-price";

function conflict(): never {
  throw new ConflictException("checkout_stock_conflict");
}
function reply(intent: CheckoutStockIntent) {
  return {
    intentId: intent.id,
    payloadHash: intent.payloadHash,
    state: intent.state,
  };
}

@Injectable()
export class CheckoutStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogue: ProductServiceImpl,
  ) {}

  private async transaction<T>(
    intentId: string,
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`nebula-stock:${intentId}`}, 0))::text`;
          return run(tx);
        },
        { maxWait: 5000, timeout: 10000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2028", "P2034"].includes(error.code)
      )
        throw new ServiceUnavailableException("checkout_stock_busy");
      throw error;
    }
  }

  async reserve(input: unknown) {
    const request = stockReservation(input);
    // Replays remain valid after depletion/deletion; do not re-quote completed effects.
    const existing = await this.prisma.checkoutStockIntent.findUnique({
      where: { id: request.intentId },
    });
    if (existing) {
      if (existing.payloadHash !== request.payloadHash) conflict();
      return reply(existing);
    }
    for (const productId of [
      ...new Set(request.lines.map((line) => line.productId)),
    ].sort())
      await this.catalogue.getPublic(productId);
    return this.transaction(request.intentId, async (tx) => {
      const repeated = await tx.checkoutStockIntent.findUnique({
        where: { id: request.intentId },
      });
      if (repeated) {
        if (repeated.payloadHash !== request.payloadHash) conflict();
        return reply(repeated);
      }
      const created = await tx.checkoutStockIntent.create({
        data: {
          id: request.intentId,
          payloadHash: request.payloadHash,
          state: CheckoutStockState.HELD,
        },
      });
      // Product version claim locks the parent before any variant or stock edit.
      for (const productId of [
        ...new Set(request.lines.map((line) => line.productId)),
      ].sort()) {
        const selections = request.lines.filter(
          (line) => line.productId === productId,
        );
        const claimed = await tx.product.updateMany({
          where: {
            id: productId,
            version: selections[0].expectedVersion,
            status: "ACTIVE",
            deletedAt: null,
          },
          data: { version: { increment: 1 } },
        });
        if (claimed.count !== 1) conflict();
        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });
        if (product.currency !== request.currency) conflict();
        for (const line of selections) {
          const variant = line.variantId
            ? await tx.productVariant.findFirst({
                where: {
                  id: line.variantId,
                  productId,
                  active: true,
                  deletedAt: null,
                },
              })
            : null;
          if (
            line.variantId
              ? product.selectionMode !== "VARIANT" || !variant
              : product.selectionMode !== "BASE"
          )
            conflict();
          const options = variant?.options ?? {};
          if (
            JSON.stringify(Object.entries(options).sort()) !==
              JSON.stringify(Object.entries(line.selectedOptions).sort()) ||
            (variant?.sku ?? product.sku) !== line.sku ||
            effectiveProductPrice(
              product,
              new Date(),
              new Prisma.Decimal(variant?.priceOverride ?? product.price),
            ).toFixed(2) !== line.unitPrice
          )
            conflict();
          if (product.trackInventory) {
            const changed = variant
              ? await tx.productVariant.updateMany({
                  where: {
                    id: variant.id,
                    productId,
                    stockQuantity: { gte: line.quantity },
                  },
                  data: { stockQuantity: { decrement: line.quantity } },
                })
              : await tx.product.updateMany({
                  where: {
                    id: productId,
                    stockQuantity: { gte: line.quantity },
                  },
                  data: { stockQuantity: { decrement: line.quantity } },
                });
            if (changed.count !== 1) conflict();
          }
          await tx.checkoutStockLine.create({
            data: {
              intentId: request.intentId,
              productId,
              variantId: line.variantId || null,
              selectionKey: `${productId}:${line.variantId || "base"}`,
              quantity: line.quantity,
              tracked: product.trackInventory,
              heldProductId: productId,
              heldVariantId: line.variantId || null,
            },
          });
        }
      }
      return reply(created);
    });
  }

  finalize(input: unknown) {
    return this.finish(input, CheckoutStockState.FINALIZED);
  }
  cancel(input: unknown) {
    return this.finish(input, CheckoutStockState.CANCELLED);
  }

  restore(input: unknown) {
    const identity = stockIdentity(input);
    return this.transaction(identity.intentId, async (tx) => {
      const intent = await tx.checkoutStockIntent.findUnique({
        where: { id: identity.intentId },
        include: { lines: true, restoration: true },
      });
      if (
        !intent ||
        intent.payloadHash !== identity.payloadHash ||
        intent.state !== "FINALIZED"
      )
        throw new ConflictException("checkout_stock_restore_conflict");
      const result = { ...identity, state: "RESTORED" };
      // A committed receipt remains replayable after later catalogue deletion.
      if (intent.restoration) return result;
      if (intent.lines.length === 0 || intent.lines.length > 100)
        throw new ConflictException("checkout_stock_restore_conflict");
      const tracked = intent.lines.filter((line) => line.tracked);
      for (const productId of [
        ...new Set(tracked.map((line) => line.productId)),
      ].sort()) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product)
          throw new ConflictException("checkout_stock_restore_conflict");
        for (const line of tracked.filter(
          (line) => line.productId === productId,
        )) {
          if (product.selectionMode !== (line.variantId ? "VARIANT" : "BASE"))
            throw new ConflictException("checkout_stock_restore_conflict");
          const changed = line.variantId
            ? await tx.productVariant.updateMany({
                where: {
                  id: line.variantId,
                  productId,
                  stockQuantity: { lte: STOCK_INT_MAX - line.quantity },
                },
                data: { stockQuantity: { increment: line.quantity } },
              })
            : await tx.product.updateMany({
                where: {
                  id: productId,
                  stockQuantity: { lte: STOCK_INT_MAX - line.quantity },
                },
                data: { stockQuantity: { increment: line.quantity } },
              });
          if (changed.count !== 1)
            throw new ConflictException("checkout_stock_restore_conflict");
        }
        await tx.product.updateMany({
          where: { id: productId, version: { lt: STOCK_INT_MAX } },
          data: { version: { increment: 1 } },
        });
      }
      await tx.checkoutStockRestoration.create({
        data: { intentId: identity.intentId },
      });
      return result;
    });
  }

  private finish(input: unknown, state: "FINALIZED" | "CANCELLED") {
    const identity = stockIdentity(input);
    return this.transaction(identity.intentId, async (tx) => {
      const intent = await tx.checkoutStockIntent.findUnique({
        where: { id: identity.intentId },
        include: { lines: true },
      });
      if (!intent) {
        if (state === CheckoutStockState.FINALIZED) conflict();
        return reply(
          await tx.checkoutStockIntent.create({
            data: {
              id: identity.intentId,
              payloadHash: identity.payloadHash,
              state,
            },
          }),
        );
      }
      if (intent.payloadHash !== identity.payloadHash) conflict();
      if (intent.state !== CheckoutStockState.HELD) {
        if (intent.state !== state) conflict();
        return reply(intent);
      }
      // Even unmanaged holds lock parents: prevent inventory replacement racing release.
      for (const productId of [
        ...new Set(intent.lines.map((line) => line.productId)),
      ].sort()) {
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
        if (state === CheckoutStockState.CANCELLED) {
          for (const line of intent.lines.filter(
            (line) => line.productId === productId && line.tracked,
          )) {
            if (line.variantId)
              await tx.productVariant.update({
                where: { id: line.variantId },
                data: { stockQuantity: { increment: line.quantity } },
              });
            else
              await tx.product.update({
                where: { id: productId },
                data: { stockQuantity: { increment: line.quantity } },
              });
          }
          // Exhausting the catalogue version must not strand a stock refund.
          await tx.product.updateMany({
            where: { id: productId, version: { lt: STOCK_INT_MAX } },
            data: { version: { increment: 1 } },
          });
        }
      }
      await tx.checkoutStockLine.updateMany({
        where: { intentId: identity.intentId },
        data: { heldProductId: null, heldVariantId: null },
      });
      return reply(
        await tx.checkoutStockIntent.update({
          where: { id: identity.intentId },
          data: { state },
        }),
      );
    });
  }
}
