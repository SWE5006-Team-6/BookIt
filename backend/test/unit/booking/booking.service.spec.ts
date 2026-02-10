import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from '../../../src/booking/booking.service';
import { BookingRepository } from '../../../src/booking/booking.repository';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';

describe('BookingService', () => {
  let service: BookingService;
  let repository: BookingRepository;

  const mockBooking = {
    id: '1',
    roomId: 'room-1',
    bookedById: 'user-1',
    title: 'Team Meeting',
    startAt: new Date('2026-02-10T10:00:00Z'),
    endAt: new Date('2026-02-10T11:00:00Z'),
    status: BookingStatus.CONFIRMED,
    room: { id: 'room-1', name: 'Conference Room A', capacity: 10, location: 'Floor 1' },
    bookedBy: { id: 'user-1', email: 'test@example.com', displayName: 'Test User' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookingRepository = {
    findAll: jest.fn().mockResolvedValue([mockBooking]),
    findById: jest.fn().mockResolvedValue(mockBooking),
    findByRoomId: jest.fn().mockResolvedValue([mockBooking]),
    findByUserId: jest.fn().mockResolvedValue([mockBooking]),
    checkAvailability: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue(mockBooking),
    update: jest.fn().mockResolvedValue(mockBooking),
    cancel: jest.fn().mockResolvedValue(mockBooking),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BookingRepository, useValue: mockBookingRepository },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    repository = module.get<BookingRepository>(BookingRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of bookings', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockBooking]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a booking when found', async () => {
      const result = await service.findById('1');
      expect(result).toEqual(mockBooking);
      expect(repository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValueOnce(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByRoomId', () => {
    it('should return bookings for a room', async () => {
      const result = await service.findByRoomId('room-1');
      expect(result).toEqual([mockBooking]);
      expect(repository.findByRoomId).toHaveBeenCalledWith('room-1');
    });
  });

  describe('findByUserId', () => {
    it('should return bookings for a user', async () => {
      const result = await service.findByUserId('user-1');
      expect(result).toEqual([mockBooking]);
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('create', () => {
    const createDto = {
      roomId: 'room-1',
      title: 'Team Meeting',
      startAt: '2026-02-10T10:00:00Z',
      endAt: '2026-02-10T11:00:00Z',
    };

    it('should create a new booking', async () => {
      const result = await service.create(createDto, 'user-1');
      expect(result).toEqual(mockBooking);
      expect(repository.checkAvailability).toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when start >= end', async () => {
      const invalidDto = { ...createDto, endAt: '2026-02-10T09:00:00Z' };
      await expect(service.create(invalidDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when booking in past', async () => {
      const pastDto = { ...createDto, startAt: '2025-01-01T10:00:00Z' };
      await expect(service.create(pastDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when room not available', async () => {
      mockBookingRepository.checkAvailability.mockResolvedValueOnce(false);
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException on P2021', async () => {
      mockBookingRepository.create.mockRejectedValueOnce({ code: 'P2021' });
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw BadRequestException on P2003', async () => {
      mockBookingRepository.create.mockRejectedValueOnce({ code: 'P2003' });
      await expect(service.create(createDto, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { status: BookingStatus.CANCELLED };

    it('should update a booking', async () => {
      const result = await service.update('1', updateDto);
      expect(result).toEqual(mockBooking);
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.update).toHaveBeenCalledWith('1', { status: updateDto.status });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockBookingRepository.findById.mockResolvedValueOnce(null);
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a booking', async () => {
      const result = await service.cancel('1', 'Meeting cancelled');
      expect(result).toEqual(mockBooking);
      expect(repository.findById).toHaveBeenCalledWith('1');
      expect(repository.cancel).toHaveBeenCalledWith('1', 'Meeting cancelled');
    });

    it('should throw BadRequestException when already cancelled', async () => {
      const cancelled = { ...mockBooking, status: BookingStatus.CANCELLED };
      mockBookingRepository.findById.mockResolvedValueOnce(cancelled);
      await expect(service.cancel('1')).rejects.toThrow(BadRequestException);
    });
  });
});
