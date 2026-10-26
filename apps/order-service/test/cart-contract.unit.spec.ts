import { orderv1, productv1 } from "@nebula/protos";
import * as protoLoader from "@grpc/proto-loader";
import { Prisma } from "../prisma/generated/client";
import {
  cartMoney,
  cartQuantity,
  cartQuote,
  cartReply,
  checkCartStock,
  type StoredCart,
} from "../src/order/cart-contract";

import {
  PRODUCT_ID,
  VARIANT_ID,
  product,
  variantProduct,
} from "./utils/cart.fixture";

describe("Cart authoritative selection and decimal contract", () => {
  it("honors the actual defaults=true loader for absent variants and empty cart lists", () => {
    const definition = protoLoader.loadSync(
      require.resolve("@nebula/protos/order.proto"),
      { keepCase: true, defaults: true, oneofs: true },
    );
    const method = (
      definition["order.OrderService"] as protoLoader.ServiceDefinition
    ).GetCart;
    const empty = orderv1.CartResponse.create({
      data: {
        id: PRODUCT_ID,
        userId: VARIANT_ID,
        currency: "USD",
        subtotal: "0.00",
        total: "0.00",
        items: [],
      },
    });
    const decoded = method.responseDeserialize(
      Buffer.from(orderv1.CartResponse.encode(empty).finish()),
    ) as { data: { items: unknown[]; subtotal: string } };
    expect(decoded.data).toMatchObject({ items: [], subtotal: "0.00" });
    empty.data!.items = [
      orderv1.CartItem.create({
        id: VARIANT_ID,
        productId: PRODUCT_ID,
        quantity: 1,
        unitPrice: "0.00",
        lineTotal: "0.00",
      }),
    ];
    const base = method.responseDeserialize(
      Buffer.from(orderv1.CartResponse.encode(empty).finish()),
    ) as { data: { items: { variantId?: string; selectedOptions: object }[] } };
    expect(base.data.items[0].variantId).toBeUndefined();
    expect(base.data.items[0].selectedOptions).toEqual({});
  });
  it("uses the selected exact effective amount, SKU and options", () => {
    const quote = cartQuote(variantProduct(), PRODUCT_ID, VARIANT_ID, "USD");
    expect(quote).toMatchObject({
      sku: "DESK-BLUE",
      selectedOptions: { colour: "Blue" },
      selectionKey: `variant:${VARIANT_ID}`,
    });
    expect(quote.unitPrice.toFixed(2)).toBe("7.25");
    expect(
      cartQuote(
        product({ effectivePriceAmount: "0.00" }),
        PRODUCT_ID,
        undefined,
        "USD",
      ).unitPrice.toFixed(2),
    ).toBe("0.00");
  });

  it.each([
    undefined,
    "",
    "NaN",
    "-1.00",
    "1.001",
    "Infinity",
    "10000000000000000.00",
  ])("fails closed on invalid/missing price %s", (value) => {
    expect(() => cartMoney(value)).toThrow();
  });

  it.each([0, -1, 1.5, 2147483648, NaN, undefined])(
    "denies invalid add quantity %s",
    (quantity) => {
      expect(() => cartQuantity(quantity)).toThrow("cart_quantity_invalid");
    },
  );

  it("supports zero only for removals and rejects insufficient tracked stock", () => {
    expect(() => cartQuantity(0, true)).not.toThrow();
    expect(() => cartQuantity(2147483647)).not.toThrow();
    expect(() =>
      checkCartStock({ trackInventory: true, stockQuantity: 2 }, 3),
    ).toThrow("cart_insufficient_stock");
    expect(() =>
      checkCartStock({ trackInventory: false, stockQuantity: 0 }, 3),
    ).not.toThrow();
  });

  it.each([
    { status: "DRAFT" },
    { status: "ARCHIVED" },
    { deletedAt: "2026-01-01" },
    { availability: "OUT_OF_STOCK" },
  ])("denies unpublished/unavailable product %j", (changes) => {
    expect(() =>
      cartQuote(product(changes), PRODUCT_ID, undefined, "USD"),
    ).toThrow("product_unavailable");
  });

  it("denies mode, variant membership/lifecycle, missing options and currency mismatches", () => {
    expect(() => cartQuote(product(), PRODUCT_ID, VARIANT_ID, "USD")).toThrow(
      "product_base_selection_required",
    );
    expect(() =>
      cartQuote(variantProduct(), PRODUCT_ID, undefined, "USD"),
    ).toThrow("product_variant_required");
    expect(() =>
      cartQuote(variantProduct(), PRODUCT_ID, PRODUCT_ID, "USD"),
    ).toThrow("product_variant_unavailable");
    for (const change of [
      { active: false },
      { deletedAt: "deleted" },
      { productId: VARIANT_ID },
      { availability: "OUT_OF_STOCK" },
    ]) {
      const value = variantProduct();
      Object.assign(value.variants![0], change);
      expect(() => cartQuote(value, PRODUCT_ID, VARIANT_ID, "USD")).toThrow(
        "product_variant_unavailable",
      );
    }
    const invalid = variantProduct();
    invalid.variants![0].options = {};
    expect(() => cartQuote(invalid, PRODUCT_ID, VARIANT_ID, "USD")).toThrow(
      "product_options_contract_invalid",
    );
    expect(() => cartQuote(product(), PRODUCT_ID, undefined, "EUR")).toThrow(
      "product_currency_mismatch",
    );
  });

  it("preserves cents above the double safe range using the actual Product codec", () => {
    const response = productv1.Product.create({
      effectivePriceAmount: "90071992547409.91",
    });
    const decoded = productv1.Product.decode(
      productv1.Product.encode(response).finish(),
    );
    expect(cartMoney(decoded.effectivePriceAmount).mul(2).toFixed(2)).toBe(
      "180143985094819.82",
    );
  });

  it("serializes fixed money, dates/options and empty totals through the actual Cart codec", () => {
    const stored = {
      id: PRODUCT_ID,
      userId: VARIANT_ID,
      currency: "USD",
      expiresAt: new Date("2026-10-13T12:00:00Z"),
      items: [],
    } as unknown as StoredCart;
    const empty = cartReply(stored);
    expect(empty).toMatchObject({ items: [], subtotal: "0.00", total: "0.00" });
    stored.items = [
      {
        id: VARIANT_ID,
        cartId: stored.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        selectionKey: `variant:${VARIANT_ID}`,
        selectedOptions: { colour: "Blue" },
        sku: "DESK-BLUE",
        name: "Desk",
        quantity: 3,
        unitPrice: new Prisma.Decimal("0.10"),
        meta: null,
      },
    ];
    const encoded = orderv1.Cart.encode(
      orderv1.Cart.create(cartReply(stored)),
    ).finish();
    const decoded = orderv1.Cart.decode(encoded);
    expect(decoded).toMatchObject({
      subtotal: "0.30",
      total: "0.30",
      expiresAt: "2026-10-13T12:00:00.000Z",
      items: [
        {
          variantId: VARIANT_ID,
          selectedOptions: { colour: "Blue" },
          unitPrice: "0.10",
          lineTotal: "0.30",
        },
      ],
    });
    stored.items[0].unitPrice = new Prisma.Decimal("9999999999999999.99");
    expect(() => cartReply(stored)).toThrow("cart_amount_out_of_range");
  });
});
