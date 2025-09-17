import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ListGalleryDto {
  @Expose({ name: 'product_id' })
  @IsUUID() productId!: string;

  @Expose({ name: 'include_deleted' })
  @IsOptional() @IsBoolean() includeDeleted?: boolean;
}
