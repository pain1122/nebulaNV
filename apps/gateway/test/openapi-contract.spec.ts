import "reflect-metadata";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { GATEWAY_HTTP_CONTROLLERS } from "../src/app.module";
import { GatewayAuthController } from "../src/auth/gateway-auth.controller";
import { GatewayUserController } from "../src/user/gateway-user.controller";
import { GatewaySettingsController } from "../src/settings/gateway-settings.controller";
import { GatewayProductController } from "../src/product/gateway-product.controller";
import { GatewayBlogController } from "../src/blog/gateway-blog.controller";
import { GatewayProductTaxonomyController } from "../src/taxonomy/gateway-product-taxonomy.controller";
import { GatewayBlogTaxonomyController } from "../src/taxonomy/gateway-blog-taxonomy.controller";
import { GatewayOrderController } from "../src/order/gateway-order.controller";
import { GatewayMediaPublicController } from "../src/media/gateway-media-public.controller";
import { GatewayMediaProtectedController } from "../src/media/gateway-media-protected.controller";
import { GatewayMediaStrictController } from "../src/media/gateway-media-strict.controller";
import { GatewayMediaOwnedController } from "../src/media/gateway-media-owned.controller";
import { GatewayMediaRenderController } from "../src/media/gateway-media-render.controller";
import { GatewayMediaAdminController } from "../src/media/gateway-media-admin.controller";
import { GatewayApiRoute } from "../src/contracts/gateway-api-route.decorator";
import { GATEWAY_ROUTE_POLICIES } from "../src/contracts/route-policy";
import {
  generateGatewayOpenApiDocument,
  serializeGatewayOpenApiDocument,
} from "../src/openapi/gateway-openapi";
import { checkGatewayOpenApi } from "../src/openapi/openapi-file";

class RouteDecoratorProbe {
  @GatewayApiRoute("auth.register")
  register(): void {}

  @GatewayApiRoute("products.list")
  listProducts(): void {}
}

describe("gateway OpenAPI contract setup", () => {
  it("derives runtime method/path from the route manifest ID", () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RouteDecoratorProbe.prototype.register,
      ),
    ).toBe("auth/register");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RouteDecoratorProbe.prototype.register,
      ),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        RouteDecoratorProbe.prototype.listProducts,
      ),
    ).toBe("products");
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        RouteDecoratorProbe.prototype.listProducts,
      ),
    ).toBe(RequestMethod.GET);
  });

  it("creates every landed domain path without runtime dependencies", async () => {
    const document = await generateGatewayOpenApiDocument();

    expect(document.openapi).toMatch(/^3\./);
    expect(document.info).toMatchObject({
      title: "Nebula External API",
      version: "1.0.0",
    });
    expect(Object.keys(document.paths).sort()).toEqual([
      "/api/v1/admin/blog-taxonomies",
      "/api/v1/admin/blog-taxonomies/{id}",
      "/api/v1/admin/blog/posts",
      "/api/v1/admin/blog/posts/{id}",
      "/api/v1/admin/media/protected-library",
      "/api/v1/admin/media/protected-library/finalize",
      "/api/v1/admin/media/protected-library/presign",
      "/api/v1/admin/media/protected-library/{id}",
      "/api/v1/admin/media/protected-library/{id}/read-url",
      "/api/v1/admin/media/public-library",
      "/api/v1/admin/media/public-library/delete-confirm",
      "/api/v1/admin/media/public-library/delete-preview",
      "/api/v1/admin/media/public-library/finalize",
      "/api/v1/admin/media/public-library/presign",
      "/api/v1/admin/media/public-library/{id}/read-url",
      "/api/v1/admin/media/strict-library",
      "/api/v1/admin/media/strict-library/finalize",
      "/api/v1/admin/media/strict-library/presign",
      "/api/v1/admin/media/strict-library/{id}",
      "/api/v1/admin/media/strict-library/{id}/read-url",
      "/api/v1/admin/media/{id}",
      "/api/v1/admin/orders/{id}/status",
      "/api/v1/admin/product-taxonomies",
      "/api/v1/admin/product-taxonomies/{id}",
      "/api/v1/admin/products",
      "/api/v1/admin/products/discounts/bulk",
      "/api/v1/admin/products/{id}",
      "/api/v1/admin/products/{id}/gallery",
      "/api/v1/admin/products/{id}/gallery/order",
      "/api/v1/admin/products/{id}/gallery/{imageId}",
      "/api/v1/admin/products/{id}/hard",
      "/api/v1/admin/products/{id}/restore",
      "/api/v1/admin/settings/{ns}/{key}",
      "/api/v1/admin/users",
      "/api/v1/admin/users/{id}",
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/auth/me",
      "/api/v1/auth/refresh",
      "/api/v1/auth/register",
      "/api/v1/blog-taxonomies",
      "/api/v1/blog-taxonomies/{id}",
      "/api/v1/blog/posts",
      "/api/v1/blog/posts/{slug}",
      "/api/v1/media/my/protected-library",
      "/api/v1/media/my/protected-library/{id}/read-url",
      "/api/v1/media/render/{id}",
      "/api/v1/orders",
      "/api/v1/orders/cart",
      "/api/v1/orders/cart/items",
      "/api/v1/orders/cart/items/{id}",
      "/api/v1/orders/checkout",
      "/api/v1/orders/{id}",
      "/api/v1/product-taxonomies",
      "/api/v1/product-taxonomies/{id}",
      "/api/v1/products",
      "/api/v1/products/{id}",
      "/api/v1/products/{id}/gallery",
      "/api/v1/settings/{ns}/{key}",
      "/api/v1/users/me",
    ]);
    expect(document.paths).not.toHaveProperty("/health");
    const operationIds = Object.values(document.paths)
      .flatMap((path) => Object.values(path))
      .flatMap((operation) =>
        operation && typeof operation === "object" && "operationId" in operation
          ? [String(operation.operationId)]
          : [],
      )
      .sort();
    expect(operationIds).toEqual(
      GATEWAY_ROUTE_POLICIES.map((policy) =>
        policy.id.replace(/[^A-Za-z0-9_]/g, "_"),
      ).sort(),
    );
    for (const pathItem of Object.values(document.paths)) {
      for (const operation of Object.values(pathItem)) {
        if (
          !operation ||
          typeof operation !== "object" ||
          !("responses" in operation)
        ) {
          continue;
        }
        const parameterKeys = (operation.parameters ?? []).map((parameter) =>
          "$ref" in parameter
            ? `$ref:${parameter.$ref}`
            : `${parameter.in}:${parameter.name}`,
        );
        expect(new Set(parameterKeys).size).toBe(parameterKeys.length);
      }
    }
    expect(document.components?.securitySchemes).toHaveProperty("access-token");
    expect(document.components?.securitySchemes).not.toHaveProperty(
      "public-client-id",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GatewayErrorEnvelopeDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GatewayAuthTokenDto",
    );
    expect(document.components?.schemas).toHaveProperty("GatewayUserDto");
    expect(document.components?.schemas).not.toHaveProperty(
      "GatewayAuthUserDto",
    );
    expect(GATEWAY_HTTP_CONTROLLERS).toEqual([
      GatewayAuthController,
      GatewayUserController,
      GatewaySettingsController,
      GatewayProductController,
      GatewayBlogController,
      GatewayProductTaxonomyController,
      GatewayBlogTaxonomyController,
      GatewayOrderController,
      GatewayMediaPublicController,
      GatewayMediaProtectedController,
      GatewayMediaStrictController,
      GatewayMediaOwnedController,
      GatewayMediaRenderController,
      GatewayMediaAdminController,
    ]);

    const publicProducts = document.paths["/api/v1/products"]?.get;
    expect(publicProducts?.security).toBeUndefined();
    expect(publicProducts?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: "query", name: "page" }),
        expect.objectContaining({ in: "query", name: "limit" }),
      ]),
    );
    const productCreate = document.paths["/api/v1/admin/products"]?.post;
    expect(productCreate?.responses).toHaveProperty("201");
    expect(productCreate?.security).toEqual([{ "access-token": [] }]);
    expect(productCreate?.parameters).toContainEqual(
      expect.objectContaining({ in: "header", name: "Idempotency-Key" }),
    );

    const productTaxonomies =
      document.paths["/api/v1/product-taxonomies"]?.get;
    expect(productTaxonomies?.parameters).toContainEqual(
      expect.objectContaining({
        in: "query",
        name: "kind",
        required: true,
      }),
    );
    const blogCreate = document.paths["/api/v1/admin/blog/posts"]?.post;
    expect(blogCreate?.security).toEqual([{ "access-token": [] }]);
    expect(document.paths).not.toHaveProperty("/api/v1/admin/blog/posts/{slug}");
    expect(document.paths).not.toHaveProperty("/api/v1/taxonomies");

    expect(document.paths["/api/v1/orders"]?.get?.security).toEqual([
      { "access-token": [] },
    ]);
    expect(document.paths).not.toHaveProperty("/api/v1/admin/orders");

    const render = document.paths["/api/v1/media/render/{id}"]?.get;
    expect(render?.security).toBeUndefined();
    expect(render?.responses["200"]).toMatchObject({
      content: {
        "application/octet-stream": {
          schema: { type: "string", format: "binary" },
        },
      },
    });
    expect(render?.parameters).toContainEqual(
      expect.objectContaining({
        in: "path",
        name: "id",
        schema: expect.objectContaining({ format: "uuid" }),
      }),
    );
    expect(render?.parameters).toContainEqual(
      expect.objectContaining({
        in: "query",
        name: "variant",
        schema: expect.objectContaining({ enum: ["web"] }),
      }),
    );

    const login = document.paths["/api/v1/auth/login"]?.post;
    expect(login?.operationId).toBe("auth_login");
    expect(login?.responses).toHaveProperty("200");
    expect(login?.responses).not.toHaveProperty("201");
    expect(login?.security).toBeUndefined();

    const refresh = document.paths["/api/v1/auth/refresh"]?.post;
    expect(refresh?.requestBody).toMatchObject({ required: false });
    expect(refresh?.security).toBeUndefined();

    const profile = document.paths["/api/v1/auth/me"]?.get;
    expect(profile?.security).toEqual([{ "access-token": [] }]);
    expect(profile?.responses["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            allOf: [
              { $ref: "#/components/schemas/GatewayItemEnvelopeDto" },
              {
                properties: {
                  data: {
                    $ref: "#/components/schemas/GatewayUserDto",
                  },
                },
              },
            ],
          },
        },
      },
    });

    const userList = document.paths["/api/v1/admin/users"]?.get;
    expect(userList?.security).toEqual([{ "access-token": [] }]);
    expect(userList?.responses["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            allOf: [
              { $ref: "#/components/schemas/GatewayCollectionEnvelopeDto" },
              {
                properties: {
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/GatewayUserListItemDto",
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(
      document.paths["/api/v1/admin/users/{id}"]?.get?.parameters,
    ).toContainEqual(
      expect.objectContaining({
        in: "path",
        name: "id",
        required: true,
        schema: expect.objectContaining({ format: "uuid" }),
      }),
    );

    const publicSetting =
      document.paths["/api/v1/settings/{ns}/{key}"]?.get;
    expect(publicSetting?.security).toBeUndefined();
    expect(publicSetting?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: "path", name: "ns", required: true }),
        expect.objectContaining({ in: "path", name: "key", required: true }),
      ]),
    );
    const adminSetting =
      document.paths["/api/v1/admin/settings/{ns}/{key}"]?.put;
    expect(adminSetting?.security).toEqual([{ "access-token": [] }]);
    expect(adminSetting?.requestBody).toMatchObject({
      required: true,
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/GatewaySettingWriteRequestDto",
          },
        },
      },
    });
  });

  it("serializes deterministically with sorted keys and a final newline", () => {
    const serialized = serializeGatewayOpenApiDocument({
      openapi: "3.0.0",
      info: { title: "Nebula", version: "1" },
      paths: { "/z": {}, "/a": {} },
      tags: [],
      servers: [],
      components: {},
    });
    expect(serialized.indexOf('"/a"')).toBeLessThan(serialized.indexOf('"/z"'));
    expect(serialized.endsWith("\n")).toBe(true);
  });

  it("keeps the checked landed-route document byte-for-byte current", async () => {
    await expect(checkGatewayOpenApi()).resolves.toBeUndefined();
  });
});
