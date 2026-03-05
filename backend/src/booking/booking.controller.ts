import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('room/:roomId')
  findByRoomId(@Param('roomId') roomId: string) {
    return this.bookingService.findByRoomId(roomId);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.bookingService.findByUserId(userId, user);
  }

  @Get(':id')
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.findById(id, user);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser('id') userId: string) {
    return this.bookingService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingService.update(id, dto, user);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string } = {},
    @CurrentUser() user: User,
  ) {
    return this.bookingService.cancel(id, body.reason, user);
  }

  @Post(':id/check-in')
  checkIn(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.checkIn(id, user);
  }
}
