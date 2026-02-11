import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RoomRepository } from './room.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomService {
  constructor(private readonly roomRepository: RoomRepository) {}

  async findAll() {
    return this.roomRepository.findAll();
  }

  async findById(id: string) {
    const room = await this.roomRepository.findById(id);
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async create(dto: CreateRoomDto, userId: string) {
    const existing = await this.roomRepository.findByName(dto.name);
    if (existing) {
      throw new BadRequestException('Room with this name already exists');
    }

    return this.roomRepository.create({
      name: dto.name,
      capacity: dto.capacity,
      location: dto.location,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async update(id: string, dto: UpdateRoomDto, userId: string) {
    await this.findById(id);
    return this.roomRepository.update(id, { ...dto, updatedBy: userId });
  }

  async delete(id: string, userId: string) {
    await this.findById(id);
    return this.roomRepository.delete(id, userId);
  }
}
