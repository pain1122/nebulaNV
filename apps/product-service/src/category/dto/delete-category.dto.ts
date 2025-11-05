import { IsOptional, IsUUID } from 'class-validator';

export class DeleteCategoryDto {
  @IsOptional()
  @IsUUID('4')
  substituteId?: string;
}
