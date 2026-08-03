import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  identifier!: string; // email OR phone
  @IsString()
  password!: string;
}
