export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  DEACTIVATED = 'DEACTIVATED',
}

export interface RoomStateData {
  isActive: boolean;
  isAvailable: boolean;
  reason: string | null;
}

export interface RoomState {
  getStatus(): RoomStatus;
  canBook(): boolean;
  canModify(): boolean;
  transitionToAvailable(): RoomStateData;
  transitionToMaintenance(reason: string): RoomStateData;
  transitionToDeactivated(): RoomStateData;
}
