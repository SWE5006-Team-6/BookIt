import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchRoomsDto } from './dto/search-room.dto';
import {
  UpdateRoomStatusDto,
  RoomStatusAction,
} from './dto/update-room-status.dto';
import { RoomStateFactory } from './state/room-state.factory';
import { RoomValidatorService } from './validation/room-validator.service';
import { parseSingaporeDateAndTime } from '../common/time/singapore-time';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepo: RoomsRepository,
    private readonly roomValidator: RoomValidatorService,
  ) {}

  async createRoom(dto: CreateRoomDto, userId: string) {
    await this.roomValidator.validateCreate({
      name: dto.name,
      capacity: dto.capacity,
    });

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
    const dateTime = parseSingaporeDateAndTime(dto.date, dto.time);
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

    const state = RoomStateFactory.fromRoom(existing);
    if (!state.canModify()) {
      throw new BadRequestException(
        `Cannot modify a room in ${state.getStatus()} state`,
      );
    }

    await this.roomValidator.validateUpdate(
      { name: dto.name, capacity: dto.capacity },
      existing,
    );

    const name = dto.name?.trim() ? dto.name : existing.name;
    const location = dto.location?.trim() ? dto.location : existing.location;
    const capacity = dto.capacity ?? existing.capacity;

    return this.roomsRepo.updateRoom(roomId, {
      name,
      capacity,
      location,
      updatedBy: userId,
    });
  }

  async updateRoomStatus(
    roomId: string,
    dto: UpdateRoomStatusDto,
    userId: string,
  ) {
    const existing = await this.roomsRepo.findById(roomId);
    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    const state = RoomStateFactory.fromRoom(existing);
    let stateData;

    switch (dto.action) {
      case RoomStatusAction.MARK_AVAILABLE:
      case RoomStatusAction.REACTIVATE:
        stateData = state.transitionToAvailable();
        break;
      case RoomStatusAction.MARK_MAINTENANCE:
        if (!dto.reason?.trim()) {
          throw new BadRequestException(
            'A reason is required when marking a room for maintenance',
          );
        }
        stateData = state.transitionToMaintenance(dto.reason.trim());
        break;
      case RoomStatusAction.DEACTIVATE:
        stateData = state.transitionToDeactivated();
        break;
    }

    return this.roomsRepo.updateRoom(roomId, {
      ...stateData,
      updatedBy: userId,
    });
  }

  async deleteRoom(roomId: string, userId: string) {
    const existing = await this.roomsRepo.findById(roomId);
    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    const state = RoomStateFactory.fromRoom(existing);
    const stateData = state.transitionToDeactivated();

    return this.roomsRepo.updateRoom(roomId, {
      ...stateData,
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
