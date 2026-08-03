import "reflect-metadata";

import {
  BadRequestException,
  type ArgumentMetadata,
  ValidationPipe,
} from "@nestjs/common";
import { createHttpValidationPipe } from "@packages/config";
import { DeleteStringDto } from "../src/dto/delete-string.dto";
import { GetStringDto } from "../src/dto/get-string.dto";
import { SetStringDto } from "../src/dto/set-string.dto";
import { SettingsController } from "../src/settings.controller";
import type { SettingsService } from "../src/settings.service";

function createLegacySettingsPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}

async function rejectsBadRequest(
  pipe: ValidationPipe,
  value: unknown,
  metadata: ArgumentMetadata,
): Promise<void> {
  await expect(pipe.transform(value, metadata)).rejects.toBeInstanceOf(
    BadRequestException,
  );
}

describe("settings HTTP validation migration", () => {
  const getMetadata: ArgumentMetadata = {
    type: "query",
    metatype: GetStringDto,
  };
  const setMetadata: ArgumentMetadata = {
    type: "body",
    metatype: SetStringDto,
  };

  it("preserves valid query behavior", async () => {
    const input = {
      namespace: "product",
      key: "default_product_category",
    };

    const legacy: unknown = await createLegacySettingsPipe().transform(
      input,
      getMetadata,
    );
    const shared: unknown = await createHttpValidationPipe().transform(
      input,
      getMetadata,
    );

    expect(shared).toEqual(legacy);
    expect(shared).toBeInstanceOf(GetStringDto);
  });

  it("preserves missing-field rejection", async () => {
    const input = { namespace: "product" };

    await rejectsBadRequest(createLegacySettingsPipe(), input, getMetadata);
    await rejectsBadRequest(createHttpValidationPipe(), input, getMetadata);
  });

  it("preserves unknown-field rejection", async () => {
    const input = {
      namespace: "product",
      key: "default_product_category",
      extra: "not-allowed",
    };

    await rejectsBadRequest(createLegacySettingsPipe(), input, getMetadata);
    await rejectsBadRequest(createHttpValidationPipe(), input, getMetadata);
  });

  it("documents the intentional rejection of an implicitly converted value", async () => {
    const input = {
      namespace: "product",
      key: "default_product_category",
      value: 42,
    };

    const legacy: unknown = await createLegacySettingsPipe().transform(
      input,
      setMetadata,
    );
    expect(legacy).toMatchObject({ value: "42" });

    await rejectsBadRequest(createHttpValidationPipe(), input, setMetadata);
  });
});

describe("SettingsController defaults", () => {
  const service = {
    getString: jest.fn(),
    setString: jest.fn(),
    deleteString: jest.fn(),
  };
  const controller = new SettingsController(
    service as unknown as SettingsService,
  );

  beforeEach(() => {
    service.getString.mockResolvedValue({ value: "saved", found: true });
    service.setString.mockResolvedValue("saved");
    service.deleteString.mockResolvedValue(true);
  });

  it("preserves the default environment for reads", async () => {
    await controller.getString({
      namespace: "product",
      key: "default_product_category",
    } satisfies GetStringDto);

    expect(service.getString).toHaveBeenCalledWith(
      "product",
      "default_product_category",
      "default",
    );
  });

  it("preserves the default environment for writes", async () => {
    await controller.setString({
      namespace: "product",
      key: "default_product_category",
      value: "saved",
    } satisfies SetStringDto);

    expect(service.setString).toHaveBeenCalledWith(
      "product",
      "default_product_category",
      "saved",
      "default",
    );
  });

  it("preserves the default environment for deletes", async () => {
    await controller.deleteString({
      namespace: "product",
      key: "default_product_category",
    } satisfies DeleteStringDto);

    expect(service.deleteString).toHaveBeenCalledWith(
      "product",
      "default_product_category",
      "default",
    );
  });
});
