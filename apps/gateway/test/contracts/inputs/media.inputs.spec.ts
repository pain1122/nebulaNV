import { validateGatewayInput } from "../../../src/contracts/input-profiles";

describe("media input profiles", () => {
  it("keeps public and actor-owned lists unable to select another owner", () => {
    for (const profileName of [
      "media-public-list",
      "media-owned-list",
    ] as const) {
      expect(
        validateGatewayInput(profileName, {
          query: { ownerId: "another-user" },
        }),
      ).toEqual([{ field: "query.ownerId", code: "unknown_field" }]);
    }
    expect(
      validateGatewayInput("media-admin-list", {
        query: { ownerId: "managed-user" },
      }),
    ).toEqual([]);
  });

  it("requires upload identity fields and paired entity scope", () => {
    expect(validateGatewayInput("media-presign", { body: {} })).toEqual([
      { field: "body.filename", code: "required_field" },
      { field: "body.mimeType", code: "required_field" },
    ]);
    expect(
      validateGatewayInput("media-presign", {
        body: {
          filename: "image.png",
          mimeType: "image/png",
          entityType: "product",
        },
      }),
    ).toEqual([{ field: "body.entityId", code: "unsupported_combination" }]);
  });

  it("requires storage/path on finalize and rejects half an entity pair", () => {
    expect(
      validateGatewayInput("media-finalize", {
        body: { entityId: "entity-id" },
      }),
    ).toEqual([
      { field: "body.entityType", code: "unsupported_combination" },
      { field: "body.path", code: "required_field" },
      { field: "body.storage", code: "required_field" },
    ]);
  });

  it("requires the complete actor-owned read scope", () => {
    expect(
      validateGatewayInput("media-owned-read-url", {
        params: { id: "media-id" },
        query: { scope: "product" },
      }),
    ).toEqual([
      { field: "query.entityId", code: "required_field" },
      { field: "query.entityType", code: "required_field" },
    ]);
  });

  it("requires confirmation material for public deletion", () => {
    expect(
      validateGatewayInput("media-delete-confirm", {
        body: { items: [] },
      }),
    ).toEqual([{ field: "body.confirmToken", code: "required_field" }]);
  });

  it("keeps render input to fixed media ID and supported variant", () => {
    expect(
      validateGatewayInput("media-render", {
        params: { id: "media-id" },
        query: { variant: "web" },
      }),
    ).toEqual([]);
    expect(
      validateGatewayInput("media-render", {
        params: { id: "media-id" },
        query: { upstreamUrl: "https://attacker.example" },
      }),
    ).toEqual([{ field: "query.upstreamUrl", code: "unknown_field" }]);
  });
});
