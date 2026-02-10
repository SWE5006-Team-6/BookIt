import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchRoomsDto } from './dto/search-room.dto';

@Injectable()
export class RoomsService {
  constructor(private roomsRepo: RoomsRepository) {}

  async createRoom(dto: CreateRoomDto, userId: string) {
    return this.roomsRepo.createRoom({
      name: dto.name,
      capacity: dto.capacity,
      location: dto.location ?? null,
      isActive: dto.isActive ?? true,
      isAvailable: dto.isAvailable ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async searchAvailableRooms(dto: SearchRoomsDto) {
    const dateTime = new Date(`${dto.date}T${dto.time}:00`);
    const capacity = dto.capacity ?? 1;

    if (Number.isNaN(dateTime.getTime())) {
      throw new BadRequestException('Invalid date or time');
    }

    return this.roomsRepo.searchAvailableRooms({ dateTime, capacity });
  }

  async updateRoom(roomId: string, dto: UpdateRoomDto, userId: string) {
    const existing = await this.roomsRepo.findById(roomId);
    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    const name = dto.name?.trim() ? dto.name : existing.name;
    const location = dto.location?.trim() ? dto.location : existing.location;
    const capacity = dto.capacity ?? existing.capacity;
    const isActive = dto.isActive ?? existing.isActive;
    const isAvailable = dto.isAvailable ?? existing.isAvailable;

    if (capacity < 1) {
      throw new BadRequestException('Capacity must be at least 1');
    }

    return this.roomsRepo.updateRoom(roomId, {
      name,
      capacity,
      location,
      isActive,
      isAvailable,
      updatedBy: userId,
    });
  }

  async deleteRoom(roomId: string, userId: string) {
    const existing = await this.roomsRepo.findById(roomId);
    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    return this.roomsRepo.updateRoom(roomId, {
      isActive: false,
      isAvailable: false,
      reason: 'Deleted',
      updatedBy: userId,
    });
  }

  async getRooms() {
    return this.roomsRepo.findAllRooms();
  }

  async getRoomById(roomId: string) {
    const room = await this.roomsRepo.findById(roomId);
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}
