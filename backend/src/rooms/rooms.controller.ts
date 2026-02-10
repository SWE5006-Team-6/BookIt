import { Body, Controller, Get, Post, Query, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchRoomsDto } from './dto/search-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: User) {
    return this.roomsService.createRoom(dto, user.id);
  }

  @Get('search')
  search(@Query() dto: SearchRoomsDto) {
    return this.roomsService.searchAvailableRooms(dto);
  }

  @Get()
  findAll() {
    return this.roomsService.getRooms();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.getRoomById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: User,
  ) {
    return this.roomsService.updateRoom(id, dto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.roomsService.deleteRoom(id, user.id);
  }
}
