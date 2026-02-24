import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ConfirmEnrollMfaDto {
  @IsString()
  @IsNotEmpty()
  factorId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Code must be 6 digits' })
  code: string;
}
