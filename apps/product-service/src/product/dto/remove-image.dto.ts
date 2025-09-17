import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class RemoveImageDto {
  @Expose({ name: 'product_id' })
  @IsUUID() productId!: string;

  @Expose({ name: 'image_id' })
  @IsUUID() imageId!: string;

  @Expose({ name: 'hard_delete' })
  @IsOptional() @IsBoolean() hardDelete?: boolean;
}
