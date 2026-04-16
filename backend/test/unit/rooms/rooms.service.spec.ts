import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomsService } from '../../../src/rooms/rooms.service';
import { RoomsRepository } from '../../../src/rooms/rooms.repository';
import { RoomValidatorService } from '../../../src/rooms/validation/room-validator.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepo: RoomsRepository;
  let roomValidator: RoomValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: RoomsRepository,
          useValue: {
            createRoom: jest.fn(),
            searchAvailableRooms: jest.fn(),
            findById: jest.fn(),
            findByName: jest.fn(),
            updateRoom: jest.fn(),
            findAllRooms: jest.fn(),
          },
        },
        {
          provide: RoomValidatorService,
          useValue: {
            validateCreate: jest.fn().mockResolvedValue(undefined),
            validateUpdate: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomsRepo = module.get<RoomsRepository>(RoomsRepository);
    roomValidator = module.get<RoomValidatorService>(RoomValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should validate and create room with defaults', async () => {
      const dto = { name: 'Room A', capacity: 5 };
      (roomsRepo.createRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.createRoom(dto as any, 'user-1');

      expect(roomValidator.validateCreate).toHaveBeenCalledWith({
        name: 'Room A',
        capacity: 5,
      });
      expect(roomsRepo.createRoom).toHaveBeenCalledWith({
        name: 'Room A',
        capacity: 5,
        location: null,
        isActive: true,
        isAvailable: true,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      });
    });

    it('should pass provided optional fields', async () => {
      const dto = {
        name: 'Room B',
        capacity: 8,
        location: 'Floor 2',
        isActive: false,
        isAvailable: false,
      };
      (roomsRepo.createRoom as jest.Mock).mockResolvedValue({ id: 'room-2' });

      await service.createRoom(dto as any, 'user-2');

      expect(roomsRepo.createRoom).toHaveBeenCalledWith({
        name: 'Room B',
        capacity: 8,
        location: 'Floor 2',
        isActive: false,
        isAvailable: false,
        createdBy: 'user-2',
        updatedBy: 'user-2',
      });
    });

    it('should not create room if validation fails', async () => {
      (roomValidator.validateCreate as jest.Mock).mockRejectedValue(
        new BadRequestException(['Name already exists']),
      );

      await expect(
        service.createRoom({ name: 'Dup', capacity: 5 } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(roomsRepo.createRoom).not.toHaveBeenCalled();
    });
  });

  describe('searchAvailableRooms', () => {
    it('should parse date/time and default capacity to 1', async () => {
      (roomsRepo.searchAvailableRooms as jest.Mock).mockResolvedValue([]);
      const dto = { date: '2026-02-10', time: '10:30' };

      await service.searchAvailableRooms(dto as any);

      expect(roomsRepo.searchAvailableRooms).toHaveBeenCalledWith({
        dateTime: new Date('2026-02-10T02:30:00.000Z'),
        capacity: 1,
      });
    });

    it('should use provided capacity', async () => {
      (roomsRepo.searchAvailableRooms as jest.Mock).mockResolvedValue([]);
      const dto = { date: '2026-02-10', time: '10:30', capacity: 4 };

      await service.searchAvailableRooms(dto as any);

      expect(roomsRepo.searchAvailableRooms).toHaveBeenCalledWith({
        dateTime: new Date('2026-02-10T02:30:00.000Z'),
        capacity: 4,
      });
    });

    it('should throw BadRequestException for invalid date/time', async () => {
      const dto = { date: 'not-a-date', time: '10:30' };

      await expect(service.searchAvailableRooms(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateRoom', () => {
    it('should throw NotFoundException when room not found', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRoom('room-404', { name: 'X' } as any, 'user-1'),
      ).rejects.toThrow(NotFoundException);

      expect(roomsRepo.updateRoom).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when room is deactivated', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        isActive: false,
        isAvailable: false,
      });

      await expect(
        service.updateRoom('room-1', { name: 'X' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(roomsRepo.updateRoom).not.toHaveBeenCalled();
    });

    it('should keep existing values for blank name/location', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        location: 'Floor 1',
        capacity: 3,
        isActive: true,
        isAvailable: true,
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.updateRoom(
        'room-1',
        { name: '   ', location: '   ' } as any,
        'user-1',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        name: 'Room A',
        capacity: 3,
        location: 'Floor 1',
        updatedBy: 'user-1',
      });
    });

    it('should apply provided fields', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        location: 'Floor 1',
        capacity: 3,
        isActive: true,
        isAvailable: true,
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.updateRoom(
        'room-1',
        { name: 'Room B', location: 'Floor 2', capacity: 5 } as any,
        'user-2',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        name: 'Room B',
        capacity: 5,
        location: 'Floor 2',
        updatedBy: 'user-2',
      });
    });
  });

  describe('updateRoomStatus', () => {
    it('should throw NotFoundException when room not found', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateRoomStatus(
          'room-404',
          { action: 'MARK_MAINTENANCE', reason: 'test' } as any,
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark an available room as maintenance', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: true,
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.updateRoomStatus(
        'room-1',
        { action: 'MARK_MAINTENANCE', reason: 'AV upgrade' } as any,
        'user-1',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        isActive: true,
        isAvailable: false,
        reason: 'AV upgrade',
        updatedBy: 'user-1',
      });
    });

    it('should require reason when marking maintenance', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: true,
      });

      await expect(
        service.updateRoomStatus(
          'room-1',
          { action: 'MARK_MAINTENANCE' } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark a maintenance room as available', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: false,
        reason: 'AV upgrade',
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.updateRoomStatus(
        'room-1',
        { action: 'MARK_AVAILABLE' } as any,
        'user-1',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        isActive: true,
        isAvailable: true,
        reason: null,
        updatedBy: 'user-1',
      });
    });

    it('should deactivate a room', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: true,
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.updateRoomStatus(
        'room-1',
        { action: 'DEACTIVATE' } as any,
        'user-1',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        isActive: false,
        isAvailable: false,
        reason: 'Deactivated',
        updatedBy: 'user-1',
      });
    });

    it('should throw when marking an already available room as available', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: true,
      });

      await expect(
        service.updateRoomStatus(
          'room-1',
          { action: 'MARK_AVAILABLE' } as any,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRoom', () => {
    it('should throw NotFoundException when room not found', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRoom('room-404', 'user-1')).rejects.toThrow(
        NotFoundException,
      );

      expect(roomsRepo.updateRoom).not.toHaveBeenCalled();
    });

    it('should deactivate room via state transition', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        isActive: true,
        isAvailable: true,
      });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.deleteRoom('room-1', 'user-1');

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        isActive: false,
        isAvailable: false,
        reason: 'Deactivated',
        updatedBy: 'user-1',
      });
    });
  });

  describe('getRooms', () => {
    it('should return all rooms', async () => {
      (roomsRepo.findAllRooms as jest.Mock).mockResolvedValue([{ id: 'room-1' }]);

      const result = await service.getRooms();

      expect(roomsRepo.findAllRooms).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'room-1' }]);
    });
  });

  describe('getRoomById', () => {
    it('should throw NotFoundException when room not found', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getRoomById('room-404')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return room when found', async () => {
      const room = { id: 'room-1' };
      (roomsRepo.findById as jest.Mock).mockResolvedValue(room);

      const result = await service.getRoomById('room-1');

      expect(result).toEqual(room);
    });
  });
});
