import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ListGalleryDto {
  @Expose({ name: 'productId' })
  @IsUUID('4') productId!: string;

  @Expose({ name: 'includeDeleted' })
  @IsOptional() @IsBoolean() includeDeleted?: boolean;
}
