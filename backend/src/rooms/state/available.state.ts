import { BadRequestException } from '@nestjs/common';
import { RoomState, RoomStateData, RoomStatus } from './room-state.interface';

export class AvailableState implements RoomState {
  getStatus(): RoomStatus {
    return RoomStatus.AVAILABLE;
  }

  canBook(): boolean {
    return true;
  }

  canModify(): boolean {
    return true;
  }

  transitionToAvailable(): RoomStateData {
    throw new BadRequestException('Room is already available');
  }

  transitionToMaintenance(reason: string): RoomStateData {
    return {
      isActive: true,
      isAvailable: false,
      reason,
    };
  }

  transitionToDeactivated(): RoomStateData {
    return {
      isActive: false,
      isAvailable: false,
      reason: 'Deactivated',
    };
  }
}
