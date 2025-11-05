import { Expose } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class RemoveImageDto {
  @Expose({ name: 'productId' })
  @IsUUID('4') productId!: string;

  @Expose({ name: 'imageId' })
  @IsUUID('4') imageId!: string;

  @Expose({ name: 'hardDelete' })
  @IsOptional() @IsBoolean() hardDelete?: boolean;
}
