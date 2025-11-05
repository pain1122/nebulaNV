import { IsString, Matches, IsOptional } from 'class-validator';

const SAFE = /^[a-z0-9][a-z0-9._-]*$/;

export class GetStringDto {
  @IsString() @Matches(SAFE) namespace!: string;
  @IsString() @Matches(SAFE) key!: string;
  @IsOptional() @Matches(SAFE) environment?: string;
}
