import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @Matches(/@ncs\.com\.sg$/i, {
    message: 'Only NCS email addresses (@ncs.com.sg) are allowed',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  @IsOptional()
  displayName?: string;
}
