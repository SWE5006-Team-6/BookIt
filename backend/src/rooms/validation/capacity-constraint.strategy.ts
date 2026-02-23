import { Injectable } from '@nestjs/common';
import type { Room } from '@prisma/client';
import {
  RoomValidationStrategy,
  RoomValidationData,
} from './room-validation.strategy';

const MIN_CAPACITY = 1;
const MAX_CAPACITY = 500;

@Injectable()
export class CapacityConstraintStrategy implements RoomValidationStrategy {
  async validate(
    data: RoomValidationData,
    _existingRoom?: Room | null,
  ): Promise<string[]> {
    const errors: string[] = [];

    if (data.capacity === undefined) {
      return errors;
    }

    if (!Number.isInteger(data.capacity)) {
      errors.push('Capacity must be a whole number');
      return errors;
    }

    if (data.capacity < MIN_CAPACITY) {
      errors.push(`Capacity must be at least ${MIN_CAPACITY}`);
    }

    if (data.capacity > MAX_CAPACITY) {
      errors.push(`Capacity must not exceed ${MAX_CAPACITY}`);
    }

    return errors;
  }
}
