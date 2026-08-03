import { Metadata, status } from "@grpc/grpc-js";
import { RpcException } from "@nestjs/microservices";
import { settings } from "@nebula/protos";
import type { RpcContextWithContext } from "@nebula/grpc-auth";
import { SettingsGrpcController } from "../src/grpc/settings-grpc.controller";
import type { PrismaService } from "../src/prisma.service";
import { SettingsService } from "../src/settings.service";

type PrismaMock = {
  setting: {
    upsert: jest.Mock;
  };
};

function bootstrapRequest(
  patch: Partial<settings.SetStringReq> = {},
): settings.SetStringReq {
  return settings.SetStringReq.create({
    namespace: "product",
    environment: "default",
    key: "default_product_category",
    value: "category-id-1",
    ...patch,
  });
}

function serviceCall(svc: string): RpcContextWithContext {
  return { svc, svcKind: "service" };
}

async function rpcError(
  action: () => Promise<unknown>,
): Promise<{ code: number; message: string }> {
  try {
    await action();
    throw new Error("expected_rpc_error");
  } catch (error) {
    if (!(error instanceof RpcException)) throw error;
    return error.getError() as { code: number; message: string };
  }
}

describe("SettingsGrpcController.ensureBootstrapString", () => {
  let prisma: PrismaMock;
  let controller: SettingsGrpcController;
  const metadata = new Metadata();

  beforeEach(() => {
    prisma = {
      setting: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new SettingsService(prisma as unknown as PrismaService);
    controller = new SettingsGrpcController(service);
  });

  it("writes the allowed product bootstrap setting", async () => {
    const response = await controller.ensureBootstrapString(
      bootstrapRequest(),
      metadata,
      serviceCall("product-service"),
    );

    expect(response.value).toBe("category-id-1");
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: {
        namespace_environment_key: {
          namespace: "product",
          environment: "default",
          key: "default_product_category",
        },
      },
      update: { valueString: "category-id-1" },
      create: {
        namespace: "product",
        environment: "default",
        key: "default_product_category",
        valueString: "category-id-1",
      },
    });
  });

  it("uses the same upsert for repeated and replacement values", async () => {
    const call = serviceCall("product-service");

    await controller.ensureBootstrapString(bootstrapRequest(), metadata, call);
    await controller.ensureBootstrapString(bootstrapRequest(), metadata, call);
    await controller.ensureBootstrapString(
      bootstrapRequest({ value: "category-id-2" }),
      metadata,
      call,
    );

    expect(prisma.setting.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.setting.upsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        update: { valueString: "category-id-2" },
      }),
    );
  });

  it("rejects non-default environments before writing", async () => {
    const error = await rpcError(() =>
      controller.ensureBootstrapString(
        bootstrapRequest({ environment: "production" }),
        metadata,
        serviceCall("product-service"),
      ),
    );

    expect(error).toEqual({
      code: status.INVALID_ARGUMENT,
      message: "Bootstrap settings require the default environment",
    });
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
  });

  it("rejects keys outside the product allowlist", async () => {
    const error = await rpcError(() =>
      controller.ensureBootstrapString(
        bootstrapRequest({ key: "another_setting" }),
        metadata,
        serviceCall("product-service"),
      ),
    );

    expect(error.code).toBe(status.PERMISSION_DENIED);
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
  });

  it("rejects caller and namespace mismatches", async () => {
    const error = await rpcError(() =>
      controller.ensureBootstrapString(
        bootstrapRequest(),
        metadata,
        serviceCall("blog-service"),
      ),
    );

    expect(error.code).toBe(status.PERMISSION_DENIED);
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
  });
});
