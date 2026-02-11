import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsInt()
  capacity: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
