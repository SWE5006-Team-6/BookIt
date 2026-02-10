import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('room/:roomId')
  findByRoomId(@Param('roomId') roomId: string) {
    return this.bookingService.findByRoomId(roomId);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.bookingService.findByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() dto: CreateBookingDto, @CurrentUser('id') userId: string) {
    return this.bookingService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingService.update(id, dto);
  }

  @Post(':id/cancel')
  @UseGuards(SupabaseAuthGuard)
  cancel(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.bookingService.cancel(id, body?.reason);
  }
}
