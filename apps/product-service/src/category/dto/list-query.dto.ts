import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCategoriesQuery {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  publicOnly?: boolean;
}