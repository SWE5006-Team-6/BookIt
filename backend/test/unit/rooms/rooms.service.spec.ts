import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomsService } from '../../../src/rooms/rooms.service';
import { RoomsRepository } from '../../../src/rooms/rooms.repository';

describe('RoomsService', () => {
  let service: RoomsService;
  let roomsRepo: RoomsRepository;

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
            updateRoom: jest.fn(),
            findAllRooms: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    roomsRepo = module.get<RoomsRepository>(RoomsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should apply defaults and set audit fields', async () => {
      const dto = { name: 'Room A', capacity: 5 };
      (roomsRepo.createRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.createRoom(dto as any, 'user-1');

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
  });

  describe('searchAvailableRooms', () => {
    it('should parse date/time and default capacity to 1', async () => {
      (roomsRepo.searchAvailableRooms as jest.Mock).mockResolvedValue([]);
      const dto = { date: '2026-02-10', time: '10:30' };

      await service.searchAvailableRooms(dto as any);

      expect(roomsRepo.searchAvailableRooms).toHaveBeenCalledWith({
        dateTime: new Date('2026-02-10T10:30:00'),
        capacity: 1,
      });
    });

    it('should use provided capacity', async () => {
      (roomsRepo.searchAvailableRooms as jest.Mock).mockResolvedValue([]);
      const dto = { date: '2026-02-10', time: '10:30', capacity: 4 };

      await service.searchAvailableRooms(dto as any);

      expect(roomsRepo.searchAvailableRooms).toHaveBeenCalledWith({
        dateTime: new Date('2026-02-10T10:30:00'),
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

    it('should throw BadRequestException when capacity < 1', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({
        id: 'room-1',
        name: 'Room A',
        location: 'Floor 1',
        capacity: 3,
        isActive: true,
        isAvailable: true,
      });

      await expect(
        service.updateRoom('room-1', { capacity: 0 } as any, 'user-1'),
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
        isActive: true,
        isAvailable: true,
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
        { name: 'Room B', location: 'Floor 2', capacity: 5, isActive: false } as any,
        'user-2',
      );

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        name: 'Room B',
        capacity: 5,
        location: 'Floor 2',
        isActive: false,
        isAvailable: true,
        updatedBy: 'user-2',
      });
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

    it('should deactivate room and mark unavailable', async () => {
      (roomsRepo.findById as jest.Mock).mockResolvedValue({ id: 'room-1' });
      (roomsRepo.updateRoom as jest.Mock).mockResolvedValue({ id: 'room-1' });

      await service.deleteRoom('room-1', 'user-1');

      expect(roomsRepo.updateRoom).toHaveBeenCalledWith('room-1', {
        isActive: false,
        isAvailable: false,
        reason: 'Deleted',
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
