import { IsUUID } from "class-validator"

export class GetMediaDto {
  @IsUUID()
  id!: string
}
