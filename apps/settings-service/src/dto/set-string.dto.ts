import { IsString, Matches, IsOptional, MaxLength } from 'class-validator';
const SAFE = /^[a-z0-9][a-z0-9._-]*$/;

export class SetStringDto {
  @IsString() @Matches(SAFE) namespace!: string;
  @IsString() @Matches(SAFE) key!: string;
  @IsOptional() @Matches(SAFE) environment?: string;
  @IsString() @MaxLength(4000) value!: string;
}
