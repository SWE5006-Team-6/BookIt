import { IsNotEmpty, IsString } from 'class-validator';

export class UnenrollMfaDto {
  @IsString()
  @IsNotEmpty()
  factorId: string;
}
