import "reflect-metadata";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { GATEWAY_HTTP_CONTROLLERS } from "../src/app.module";
import { GatewayApiRoute } from "../src/contracts/gateway-api-route.decorator";
import {
  generateGatewayOpenApiDocument,
  serializeGatewayOpenApiDocument,
} from "../src/openapi/gateway-openapi";

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

  it("creates a contract-only base document without runtime dependencies", async () => {
    const document = await generateGatewayOpenApiDocument();

    expect(document.openapi).toMatch(/^3\./);
    expect(document.info).toMatchObject({
      title: "Nebula External API",
      version: "1.0.0",
    });
    expect(document.paths).toEqual({});
    expect(document.paths).not.toHaveProperty("/health");
    expect(document.components?.securitySchemes).toHaveProperty("access-token");
    expect(document.components?.securitySchemes).not.toHaveProperty(
      "public-client-id",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GatewayErrorEnvelopeDto",
    );
    expect(GATEWAY_HTTP_CONTROLLERS).toEqual([]);
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
});
