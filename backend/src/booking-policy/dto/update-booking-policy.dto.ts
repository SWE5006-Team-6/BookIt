import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateBookingPolicyDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
