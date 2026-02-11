import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  findAll() {
    return this.roomService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.roomService.findById(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(@Body() dto: CreateRoomDto, @CurrentUser('id') userId: string) {
    return this.roomService.create(dto, userId);
  }

  @Put(':id')
  @UseGuards(SupabaseAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto, @CurrentUser('id') userId: string) {
    return this.roomService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.roomService.delete(id, userId);
  }
}
