import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RoomStatusAction {
  MARK_AVAILABLE = 'MARK_AVAILABLE',
  MARK_MAINTENANCE = 'MARK_MAINTENANCE',
  DEACTIVATE = 'DEACTIVATE',
  REACTIVATE = 'REACTIVATE',
}

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatusAction)
  action: RoomStatusAction;

  @IsString()
  @IsOptional()
  reason?: string;
}
