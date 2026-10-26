import { IsIn, IsUUID } from "class-validator";

export class ResolveProductReferenceDto {
  @IsUUID("4")
  id!: string;

  @IsIn(["THUMBNAIL", "GALLERY"])
  role!: "THUMBNAIL" | "GALLERY";
}
