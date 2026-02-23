import { Injectable } from '@nestjs/common';
import type { Room } from '@prisma/client';
import {
  RoomValidationStrategy,
  RoomValidationData,
} from './room-validation.strategy';
import { RoomsRepository } from '../rooms.repository';

@Injectable()
export class NameUniquenessStrategy implements RoomValidationStrategy {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async validate(
    data: RoomValidationData,
    existingRoom?: Room | null,
  ): Promise<string[]> {
    const errors: string[] = [];

    if (!data.name) {
      return errors;
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) {
      errors.push('Room name cannot be empty');
      return errors;
    }

    const roomWithSameName = await this.roomsRepository.findByName(trimmedName);

    if (roomWithSameName && roomWithSameName.id !== existingRoom?.id) {
      errors.push('A room with this name already exists');
    }

    return errors;
  }
}
