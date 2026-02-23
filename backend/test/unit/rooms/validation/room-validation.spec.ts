import { CapacityConstraintStrategy } from '../../../../src/rooms/validation/capacity-constraint.strategy';
import { NameUniquenessStrategy } from '../../../../src/rooms/validation/name-uniqueness.strategy';
import { RoomValidatorService } from '../../../../src/rooms/validation/room-validator.service';
import { BadRequestException } from '@nestjs/common';

describe('CapacityConstraintStrategy', () => {
  const strategy = new CapacityConstraintStrategy();

  it('should return no errors for valid capacity', async () => {
    const errors = await strategy.validate({ capacity: 10 });
    expect(errors).toEqual([]);
  });

  it('should return no errors when capacity is undefined', async () => {
    const errors = await strategy.validate({});
    expect(errors).toEqual([]);
  });

  it('should return error for capacity less than 1', async () => {
    const errors = await strategy.validate({ capacity: 0 });
    expect(errors).toContain('Capacity must be at least 1');
  });

  it('should return error for capacity exceeding 500', async () => {
    const errors = await strategy.validate({ capacity: 501 });
    expect(errors).toContain('Capacity must not exceed 500');
  });

  it('should return error for non-integer capacity', async () => {
    const errors = await strategy.validate({ capacity: 3.5 });
    expect(errors).toContain('Capacity must be a whole number');
  });
});

describe('NameUniquenessStrategy', () => {
  const mockRepo = {
    findByName: jest.fn(),
  };
  const strategy = new NameUniquenessStrategy(mockRepo as any);

  afterEach(() => jest.clearAllMocks());

  it('should return no errors when name is not provided', async () => {
    const errors = await strategy.validate({});
    expect(errors).toEqual([]);
    expect(mockRepo.findByName).not.toHaveBeenCalled();
  });

  it('should return error for empty name', async () => {
    const errors = await strategy.validate({ name: '   ' });
    expect(errors).toContain('Room name cannot be empty');
  });

  it('should return no errors when name is unique', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    const errors = await strategy.validate({ name: 'New Room' });
    expect(errors).toEqual([]);
  });

  it('should return error when name already exists', async () => {
    mockRepo.findByName.mockResolvedValue({ id: 'other-room', name: 'Existing Room' });
    const errors = await strategy.validate({ name: 'Existing Room' });
    expect(errors).toContain('A room with this name already exists');
  });

  it('should allow same name when updating the same room', async () => {
    const existingRoom = { id: 'room-1', name: 'Room A' };
    mockRepo.findByName.mockResolvedValue(existingRoom);

    const errors = await strategy.validate(
      { name: 'Room A' },
      existingRoom as any,
    );
    expect(errors).toEqual([]);
  });
});

describe('RoomValidatorService', () => {
  let mockCapacityStrategy: { validate: jest.Mock };
  let mockNameStrategy: { validate: jest.Mock };
  let validator: RoomValidatorService;

  beforeEach(() => {
    mockCapacityStrategy = { validate: jest.fn().mockResolvedValue([]) };
    mockNameStrategy = { validate: jest.fn().mockResolvedValue([]) };
    validator = new RoomValidatorService(
      mockCapacityStrategy as any,
      mockNameStrategy as any,
    );
  });

  it('should not throw when all strategies return no errors', async () => {
    await expect(
      validator.validateCreate({ name: 'Room A', capacity: 10 }),
    ).resolves.toBeUndefined();
  });

  it('should throw BadRequestException when strategies return errors', async () => {
    mockCapacityStrategy.validate.mockResolvedValue(['Capacity too low']);
    mockNameStrategy.validate.mockResolvedValue(['Name already exists']);

    await expect(
      validator.validateCreate({ name: 'Room A', capacity: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should pass existing room to strategies during update validation', async () => {
    const existingRoom = { id: 'room-1' } as any;
    await validator.validateUpdate({ name: 'Room B' }, existingRoom);

    expect(mockCapacityStrategy.validate).toHaveBeenCalledWith(
      { name: 'Room B' },
      existingRoom,
    );
    expect(mockNameStrategy.validate).toHaveBeenCalledWith(
      { name: 'Room B' },
      existingRoom,
    );
  });
});
