import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { BookingController } from '../../../src/booking/booking.controller';
import { BookingService } from '../../../src/booking/booking.service';
import { CreateBookingDto } from '../../../src/booking/dto/create-booking.dto';
import { UpdateBookingDto } from '../../../src/booking/dto/update-booking.dto';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';
import { RolesGuard } from '../../../src/auth/guards/roles.guard';

describe('BookingController', () => {
  let controller: BookingController;
  let service: BookingService;

  const mockBooking = {
    id: '1',
    roomId: 'room-1',
    bookedById: 'user-1',
    title: 'Team Meeting',
    startAt: new Date('2026-02-10T10:00:00Z'),
    endAt: new Date('2026-02-10T11:00:00Z'),
    status: 'CONFIRMED',
    room: {
      id: 'room-1',
      name: 'Conference Room A',
      capacity: 10,
      location: 'Floor 1',
    },
    bookedBy: {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    role: UserRole.USER,
  } as any;

  const mockBookingService = {
    findAll: jest.fn().mockResolvedValue([mockBooking]),
    findById: jest.fn().mockResolvedValue(mockBooking),
    findByRoomId: jest.fn().mockResolvedValue([mockBooking]),
    findByUserId: jest.fn().mockResolvedValue([mockBooking]),
    create: jest.fn().mockResolvedValue(mockBooking),
    update: jest.fn().mockResolvedValue(mockBooking),
    cancel: jest.fn().mockResolvedValue(mockBooking),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BookingController>(BookingController);
    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of bookings', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockBooking]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findByRoomId', () => {
    it('should return bookings for a room', async () => {
      const result = await controller.findByRoomId('room-1');
      expect(result).toEqual([mockBooking]);
      expect(service.findByRoomId).toHaveBeenCalledWith('room-1');
    });
  });

  describe('findByUserId', () => {
    it('should return bookings for a user', async () => {
      const result = await controller.findByUserId('user-1', mockUser);
      expect(result).toEqual([mockBooking]);
      expect(service.findByUserId).toHaveBeenCalledWith('user-1', mockUser);
    });
  });

  describe('findById', () => {
    it('should return a booking by id', async () => {
      const result = await controller.findById('1', mockUser);
      expect(result).toEqual(mockBooking);
      expect(service.findById).toHaveBeenCalledWith('1', mockUser);
    });
  });

  describe('create', () => {
    const createDto: CreateBookingDto = {
      roomId: 'room-1',
      title: 'Team Meeting',
      startAt: '2026-02-10T10:00:00Z',
      endAt: '2026-02-10T11:00:00Z',
    };

    it('should create a new booking', async () => {
      const result = await controller.create(createDto, 'user-1');
      expect(result).toEqual(mockBooking);
      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateBookingDto = {
      status: 'CONFIRMED',
    };

    it('should update a booking', async () => {
      const result = await controller.update('1', updateDto, mockUser);
      expect(result).toEqual(mockBooking);
      expect(service.update).toHaveBeenCalledWith('1', updateDto, mockUser);
    });
  });

  describe('cancel', () => {
    it('should cancel a booking', async () => {
      const result = await controller.cancel(
        '1',
        { reason: 'Meeting cancelled' },
        mockUser,
      );
      expect(result).toEqual(mockBooking);
      expect(service.cancel).toHaveBeenCalledWith(
        '1',
        'Meeting cancelled',
        mockUser,
      );
    });

    it('should cancel a booking without reason', async () => {
      const result = await controller.cancel('1', {}, mockUser);
      expect(result).toEqual(mockBooking);
      expect(service.cancel).toHaveBeenCalledWith('1', undefined, mockUser);
    });
  });
});
