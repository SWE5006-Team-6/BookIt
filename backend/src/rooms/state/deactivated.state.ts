import { BadRequestException } from '@nestjs/common';
import { RoomState, RoomStateData, RoomStatus } from './room-state.interface';

export class DeactivatedState implements RoomState {
  getStatus(): RoomStatus {
    return RoomStatus.DEACTIVATED;
  }

  canBook(): boolean {
    return false;
  }

  canModify(): boolean {
    return false;
  }

  transitionToAvailable(): RoomStateData {
    return {
      isActive: true,
      isAvailable: true,
      reason: null,
    };
  }

  transitionToMaintenance(_reason: string): RoomStateData {
    throw new BadRequestException(
      'Cannot put a deactivated room into maintenance. Reactivate it first.',
    );
  }

  transitionToDeactivated(): RoomStateData {
    throw new BadRequestException('Room is already deactivated');
  }
}
