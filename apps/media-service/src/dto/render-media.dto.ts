import { Transform, type TransformFnParams } from "class-transformer";
import { IsIn, IsOptional, IsString } from "class-validator";

const lowerTrim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class RenderMediaDto {
  @IsOptional()
  @IsString()
  @Transform(lowerTrim)
  @IsIn(["web"])
  variant?: string;
}
