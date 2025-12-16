import { IsUUID } from "class-validator"

export class DeleteMediaDto {
  @IsUUID()
  id!: string
}
