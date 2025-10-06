import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and dashes' })
  @Length(1, 80)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}
