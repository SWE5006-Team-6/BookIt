import { BadRequestException } from '@nestjs/common';
import { RoomState, RoomStateData, RoomStatus } from './room-state.interface';

export class MaintenanceState implements RoomState {
  getStatus(): RoomStatus {
    return RoomStatus.MAINTENANCE;
  }

  canBook(): boolean {
    return false;
  }

  canModify(): boolean {
    return true;
  }

  transitionToAvailable(): RoomStateData {
    return {
      isActive: true,
      isAvailable: true,
      reason: null,
    };
  }

  transitionToMaintenance(_reason: string): RoomStateData {
    throw new BadRequestException('Room is already under maintenance');
  }

  transitionToDeactivated(): RoomStateData {
    return {
      isActive: false,
      isAvailable: false,
      reason: 'Deactivated',
    };
  }
}
