import { BadRequestException, Injectable } from '@nestjs/common';
import type { Room } from '@prisma/client';
import { RoomValidationData } from './room-validation.strategy';
import { CapacityConstraintStrategy } from './capacity-constraint.strategy';
import { NameUniquenessStrategy } from './name-uniqueness.strategy';

/**
 * Composes multiple validation strategies into a pipeline.
 * Each strategy runs independently; all errors are collected before throwing.
 */
@Injectable()
export class RoomValidatorService {
  private readonly strategies;

  constructor(
    private readonly capacityStrategy: CapacityConstraintStrategy,
    private readonly nameStrategy: NameUniquenessStrategy,
  ) {
    this.strategies = [this.capacityStrategy, this.nameStrategy];
  }

  async validateCreate(data: RoomValidationData): Promise<void> {
    await this.runValidation(data, null);
  }

  async validateUpdate(
    data: RoomValidationData,
    existingRoom: Room,
  ): Promise<void> {
    await this.runValidation(data, existingRoom);
  }

  private async runValidation(
    data: RoomValidationData,
    existingRoom: Room | null,
  ): Promise<void> {
    const allErrors: string[] = [];

    for (const strategy of this.strategies) {
      const errors = await strategy.validate(data, existingRoom);
      allErrors.push(...errors);
    }

    if (allErrors.length > 0) {
      throw new BadRequestException(allErrors);
    }
  }
}
