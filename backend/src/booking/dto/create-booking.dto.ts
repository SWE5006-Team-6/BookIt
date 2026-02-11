import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  validateSync,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateBookingDto {
  @IsString()
  roomId: string;

  @IsString()
  title: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
