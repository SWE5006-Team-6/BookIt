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

  const mockBookings = [
    {
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
        email: 'user1@example.com',
        displayName: 'User One',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      roomId: 'room-1',
      bookedById: 'user-2',
      title: 'Product Sync',
      startAt: new Date('2026-02-10T12:00:00Z'),
      endAt: new Date('2026-02-10T13:00:00Z'),
      status: 'CONFIRMED',
      room: {
        id: 'room-1',
        name: 'Conference Room A',
        capacity: 10,
        location: 'Floor 1',
      },
      bookedBy: {
        id: 'user-2',
        email: 'user2@example.com',
        displayName: 'User Two',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      roomId: 'room-2',
      bookedById: 'user-1',
      title: 'Design Review',
      startAt: new Date('2026-02-11T09:00:00Z'),
      endAt: new Date('2026-02-11T10:00:00Z'),
      status: 'CONFIRMED',
      room: {
        id: 'room-2',
        name: 'Conference Room B',
        capacity: 8,
        location: 'Floor 2',
      },
      bookedBy: {
        id: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const room1Bookings = [mockBookings[0], mockBookings[1]];
  const user1Bookings = [mockBookings[0], mockBookings[2]];
  const createResult = {
    ...mockBookings[0],
    id: '4',
    title: 'New Booking',
    startAt: new Date('2026-02-12T10:00:00Z'),
    endAt: new Date('2026-02-12T11:00:00Z'),
  };
  const updateResult = {
    ...mockBookings[0],
    title: 'Updated Team Meeting',
    status: 'CONFIRMED',
    updatedAt: new Date('2026-02-12T12:00:00Z'),
  };
  const cancelResult = {
    ...mockBookings[0],
    status: 'CANCELLED',
    cancelReason: 'Meeting cancelled',
  };

  const mockUser = {
    id: 'user-1',
    role: UserRole.USER,
  } as any;

  const mockBookingService = {
    findAll: jest.fn().mockResolvedValue(mockBookings),
    findById: jest.fn().mockResolvedValue(mockBookings[1]),
    findByRoomId: jest.fn().mockResolvedValue(room1Bookings),
    findByUserId: jest.fn().mockResolvedValue(user1Bookings),
    create: jest.fn().mockResolvedValue(createResult),
    update: jest.fn().mockResolvedValue(updateResult),
    cancel: jest.fn().mockResolvedValue(cancelResult),
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
      expect(result).toEqual(mockBookings);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findByRoomId', () => {
    it('should return bookings for a room', async () => {
      const result = await controller.findByRoomId('room-1');
      expect(result).toEqual(room1Bookings);
      expect(service.findByRoomId).toHaveBeenCalledWith('room-1');
    });
  });

  describe('findByUserId', () => {
    it('should return bookings for a user', async () => {
      const result = await controller.findByUserId('user-1', mockUser);
      expect(result).toEqual(user1Bookings);
      expect(service.findByUserId).toHaveBeenCalledWith('user-1', mockUser);
    });
  });

  describe('findById', () => {
    it('should return a booking by id', async () => {
      const result = await controller.findById('2', mockUser);
      expect(result).toEqual(mockBookings[1]);
      expect(service.findById).toHaveBeenCalledWith('2', mockUser);
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
      expect(result).toEqual(createResult);
      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateBookingDto = {
      status: 'CONFIRMED',
    };

    it('should update a booking', async () => {
      const result = await controller.update('1', updateDto, mockUser);
      expect(result).toEqual(updateResult);
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
      expect(result).toEqual(cancelResult);
      expect(service.cancel).toHaveBeenCalledWith(
        '1',
        'Meeting cancelled',
        mockUser,
      );
    });

    it('should cancel a booking without reason', async () => {
      const cancelWithoutReasonResult = {
        ...cancelResult,
        cancelReason: undefined,
      };
      mockBookingService.cancel.mockResolvedValueOnce(cancelWithoutReasonResult);

      const result = await controller.cancel('1', {}, mockUser);
      expect(result).toEqual(cancelWithoutReasonResult);
      expect(service.cancel).toHaveBeenCalledWith('1', undefined, mockUser);
    });

    it('should use default body when cancel body is omitted', async () => {
      const cancelWithoutReasonResult = {
        ...cancelResult,
        cancelReason: undefined,
      };
      mockBookingService.cancel.mockResolvedValueOnce(cancelWithoutReasonResult);

      const result = await controller.cancel('1', undefined as any, mockUser);
      expect(result).toEqual(cancelWithoutReasonResult);
      expect(service.cancel).toHaveBeenCalledWith('1', undefined, mockUser);
    });
  });

  it('loads controller module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../src/booking/booking.controller');
        expect(mod.BookingController).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
