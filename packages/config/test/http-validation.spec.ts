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
});
