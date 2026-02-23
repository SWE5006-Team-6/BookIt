import { BadRequestException } from '@nestjs/common';
import { AvailableState } from '../../../../src/rooms/state/available.state';
import { MaintenanceState } from '../../../../src/rooms/state/maintenance.state';
import { DeactivatedState } from '../../../../src/rooms/state/deactivated.state';
import { RoomStateFactory } from '../../../../src/rooms/state/room-state.factory';
import { RoomStatus } from '../../../../src/rooms/state/room-state.interface';
import type { Room } from '@prisma/client';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Test Room',
    capacity: 10,
    location: 'Floor 1',
    isActive: true,
    isAvailable: true,
    reason: null,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RoomStateFactory', () => {
  it('should return AvailableState for an active and available room', () => {
    const state = RoomStateFactory.fromRoom(makeRoom());
    expect(state.getStatus()).toBe(RoomStatus.AVAILABLE);
  });

  it('should return MaintenanceState for an active but unavailable room', () => {
    const state = RoomStateFactory.fromRoom(
      makeRoom({ isAvailable: false, reason: 'Upgrading' }),
    );
    expect(state.getStatus()).toBe(RoomStatus.MAINTENANCE);
  });

  it('should return DeactivatedState for an inactive room', () => {
    const state = RoomStateFactory.fromRoom(makeRoom({ isActive: false }));
    expect(state.getStatus()).toBe(RoomStatus.DEACTIVATED);
  });

  it('should prioritise DeactivatedState when both isActive and isAvailable are false', () => {
    const state = RoomStateFactory.fromRoom(
      makeRoom({ isActive: false, isAvailable: false }),
    );
    expect(state.getStatus()).toBe(RoomStatus.DEACTIVATED);
  });
});

describe('AvailableState', () => {
  const state = new AvailableState();

  it('should allow booking', () => {
    expect(state.canBook()).toBe(true);
  });

  it('should allow modification', () => {
    expect(state.canModify()).toBe(true);
  });

  it('should transition to Maintenance', () => {
    const data = state.transitionToMaintenance('AV upgrade');
    expect(data).toEqual({
      isActive: true,
      isAvailable: false,
      reason: 'AV upgrade',
    });
  });

  it('should transition to Deactivated', () => {
    const data = state.transitionToDeactivated();
    expect(data).toEqual({
      isActive: false,
      isAvailable: false,
      reason: 'Deactivated',
    });
  });

  it('should throw when transitioning to Available (already available)', () => {
    expect(() => state.transitionToAvailable()).toThrow(BadRequestException);
  });
});

describe('MaintenanceState', () => {
  const state = new MaintenanceState();

  it('should not allow booking', () => {
    expect(state.canBook()).toBe(false);
  });

  it('should allow modification', () => {
    expect(state.canModify()).toBe(true);
  });

  it('should transition to Available', () => {
    const data = state.transitionToAvailable();
    expect(data).toEqual({
      isActive: true,
      isAvailable: true,
      reason: null,
    });
  });

  it('should transition to Deactivated', () => {
    const data = state.transitionToDeactivated();
    expect(data).toEqual({
      isActive: false,
      isAvailable: false,
      reason: 'Deactivated',
    });
  });

  it('should throw when transitioning to Maintenance (already in maintenance)', () => {
    expect(() => state.transitionToMaintenance('reason')).toThrow(
      BadRequestException,
    );
  });
});

describe('DeactivatedState', () => {
  const state = new DeactivatedState();

  it('should not allow booking', () => {
    expect(state.canBook()).toBe(false);
  });

  it('should not allow modification', () => {
    expect(state.canModify()).toBe(false);
  });

  it('should transition to Available (reactivate)', () => {
    const data = state.transitionToAvailable();
    expect(data).toEqual({
      isActive: true,
      isAvailable: true,
      reason: null,
    });
  });

  it('should throw when transitioning to Maintenance', () => {
    expect(() => state.transitionToMaintenance('reason')).toThrow(
      BadRequestException,
    );
  });

  it('should throw when transitioning to Deactivated (already deactivated)', () => {
    expect(() => state.transitionToDeactivated()).toThrow(BadRequestException);
  });
});
