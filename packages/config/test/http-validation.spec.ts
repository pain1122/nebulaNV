import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsString } from "class-validator";
import { createHttpValidationPipe } from "../src/validation";

class ExplicitTransformRequest {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  page!: number;
}

class NoImplicitTransformRequest {
  @IsInt()
  count!: number;
}

describe("createHttpValidationPipe", () => {
  it("accepts valid input and applies an explicit DTO transform", async () => {
    const result = await createHttpValidationPipe().transform(
      { name: "example", page: "2" },
      { type: "query", metatype: ExplicitTransformRequest },
    );

    expect(result).toBeInstanceOf(ExplicitTransformRequest);
    expect(result).toEqual({ name: "example", page: 2 });
  });

  it("rejects a missing required field", async () => {
    await expect(
      createHttpValidationPipe().transform(
        { page: "2" },
        { type: "query", metatype: ExplicitTransformRequest },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an unknown field", async () => {
    await expect(
      createHttpValidationPipe().transform(
        { name: "example", page: "2", extra: "not-allowed" },
        { type: "query", metatype: ExplicitTransformRequest },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("does not infer conversions without an explicit DTO transform", async () => {
    await expect(
      createHttpValidationPipe().transform(
        { count: "2" },
        { type: "query", metatype: NoImplicitTransformRequest },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows a boundary owner to normalize errors without changing strictness", async () => {
    const exception = new BadRequestException("boundary_validation_failed");
    const exceptionFactory = jest.fn(() => exception);

    await expect(
      createHttpValidationPipe({ exceptionFactory }).transform(
        { name: "example", page: "2", extra: true },
        { type: "query", metatype: ExplicitTransformRequest },
      ),
    ).rejects.toBe(exception);
    expect(exceptionFactory).toHaveBeenCalledTimes(1);
  });
});
