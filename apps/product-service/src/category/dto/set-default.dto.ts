import { IsString, IsUUID } from 'class-validator';

export class SetDefaultDto {
  @IsString()
  @IsUUID('4')
  categoryId!: string;
}
