import type { Room } from '@prisma/client';
import { RoomState } from './room-state.interface';
import { AvailableState } from './available.state';
import { MaintenanceState } from './maintenance.state';
import { DeactivatedState } from './deactivated.state';

export class RoomStateFactory {
  static fromRoom(room: Room): RoomState {
    if (!room.isActive) {
      return new DeactivatedState();
    }
    if (!room.isAvailable) {
      return new MaintenanceState();
    }
    return new AvailableState();
  }
}
