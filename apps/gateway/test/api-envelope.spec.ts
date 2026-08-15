import {
  gatewayCollectionEnvelope,
  gatewayErrorEnvelope,
  gatewayItemEnvelope,
} from "../src/contracts/api-envelope";

describe("gateway API envelopes", () => {
  it("uses one request-correlated item/action shape", () => {
    expect(gatewayItemEnvelope({ id: "item-1" }, "request-1")).toEqual({
      data: { id: "item-1" },
      requestId: "request-1",
    });
  });

  it("keeps resource pagination explicit without fabricated fields", () => {
    expect(
      gatewayCollectionEnvelope(
        [{ id: "product-1" }],
        { profile: "total-only", total: 1 },
        "request-2",
      ),
    ).toEqual({
      data: [{ id: "product-1" }],
      meta: { pagination: { profile: "total-only", total: 1 } },
      requestId: "request-2",
    });
    expect(
      gatewayCollectionEnvelope(
        [],
        { profile: "offset-take", skip: 20, take: 20 },
        "request-3",
      ).meta.pagination,
    ).not.toHaveProperty("total");
  });

  it("uses one stable safe error shape", () => {
    expect(
      gatewayErrorEnvelope(
        "VALIDATION_FAILED",
        "Request validation failed",
        "request-4",
        [{ field: "email", code: "invalid_format" }],
      ),
    ).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: [{ field: "email", code: "invalid_format" }],
      },
      requestId: "request-4",
    });
  });

  it("refuses to construct an uncorrelated JSON envelope", () => {
    expect(() => gatewayItemEnvelope({}, " ")).toThrow(
      "gateway_response_request_id_missing",
    );
    expect(() => gatewayErrorEnvelope("INTERNAL_ERROR", "safe", "")).toThrow(
      "gateway_response_request_id_missing",
    );
  });

  it("rejects malformed or invented pagination metadata", () => {
    expect(() =>
      gatewayCollectionEnvelope(
        [],
        {
          profile: "offset-take",
          skip: 0,
          take: 20,
          total: 100,
        } as never,
        "request-5",
      ),
    ).toThrow("gateway_pagination_invalid");
    expect(() =>
      gatewayCollectionEnvelope(
        [],
        { profile: "page-limit-total", page: 0, limit: 20, total: 0 },
        "request-6",
      ),
    ).toThrow("gateway_pagination_invalid");
  });
});
