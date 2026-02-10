import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchRoomsDto {
  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time must be HH:mm (24-hour)',
  })
  time: string; // HH:mm

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
