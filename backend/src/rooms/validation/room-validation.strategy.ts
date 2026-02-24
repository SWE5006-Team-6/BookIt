import type { Room } from '@prisma/client';

export interface RoomValidationData {
  name?: string;
  capacity?: number;
  location?: string;
}

/**
 * Strategy interface for room validation.
 * Each concrete strategy encapsulates a specific validation rule.
 */
export interface RoomValidationStrategy {
  validate(
    data: RoomValidationData,
    existingRoom?: Room | null,
  ): Promise<string[]>;
}
