import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { BookingRepository } from '../../../src/booking/booking.repository';
import { BookingService } from '../../../src/booking/booking.service';
import { BookingPolicyChainService } from '../../../src/booking-policy/handlers/booking-policy-chain.service';
import { NotificationService } from '../../../src/notification/notification.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: {
    findById: jest.Mock;
    checkAvailability: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let prisma: {
    room: {
      findUnique: jest.Mock;
    };
  };
  let policyChain: {
    validate: jest.Mock;
  };
  let notificationService: {
    sendBookingConfirmedEmail: jest.Mock;
    sendBookingCancelledEmail: jest.Mock;
  };

  const room = {
    id: 'room-1',
    name: 'Room A',
    capacity: 8,
    location: 'Floor 1',
    isActive: true,
    isAvailable: true,
    reason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin',
    updatedBy: 'admin',
  };

  const requester = {
    id: 'user-1',
    role: UserRole.USER,
  } as const;

  beforeEach(async () => {
    bookingRepository = {
      findById: jest.fn(),
      checkAvailability: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({ id: 'booking-1' }),
      update: jest.fn().mockResolvedValue({ id: 'booking-1' }),
    };

    prisma = {
      room: {
        findUnique: jest.fn().mockResolvedValue(room),
      },
    };

    policyChain = {
      validate: jest.fn().mockResolvedValue(undefined),
    };

    notificationService = {
      sendBookingConfirmedEmail: jest.fn().mockResolvedValue(undefined),
      sendBookingCancelledEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: BookingRepository, useValue: bookingRepository },
        { provide: PrismaService, useValue: prisma },
        { provide: BookingPolicyChainService, useValue: policyChain },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(BookingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a booking within working hours', async () => {
      const dto = {
        roomId: 'room-1',
        title: 'Planning',
        startAt: '2099-01-01T09:00:00',
        endAt: '2099-01-01T10:00:00',
      };

      await service.create(dto, 'user-1');

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
      });
      expect(policyChain.validate).toHaveBeenCalled();
      expect(bookingRepository.checkAvailability).toHaveBeenCalled();
      expect(bookingRepository.create).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'start time is before 08:00',
        startAt: '2099-01-01T07:30:00',
        endAt: '2099-01-01T08:30:00',
        message: 'Bookings must be within working hours (08:00 to 18:00)',
      },
      {
        name: 'end time is after 18:00',
        startAt: '2099-01-01T17:30:00',
        endAt: '2099-01-01T18:30:00',
        message: 'Bookings must be within working hours (08:00 to 18:00)',
      },
      {
        name: 'booking spans into the next day',
        startAt: '2099-01-01T17:30:00',
        endAt: '2099-01-02T08:30:00',
        message: 'Bookings must start and end on the same day',
      },
    ])('rejects when $name', async ({ startAt, endAt, message }) => {
      await expect(
        service.create(
          {
            roomId: 'room-1',
            title: 'Invalid',
            startAt,
            endAt,
          },
          'user-1',
        ),
      ).rejects.toThrow(new BadRequestException(message));

      expect(prisma.room.findUnique).not.toHaveBeenCalled();
      expect(policyChain.validate).not.toHaveBeenCalled();
      expect(bookingRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      bookingRepository.findById.mockResolvedValue({
        id: 'booking-1',
        roomId: 'room-1',
        bookedById: 'user-1',
        startAt: new Date('2099-01-01T09:00:00'),
        endAt: new Date('2099-01-01T10:00:00'),
        status: 'CONFIRMED',
      });
    });

    it('rejects updates outside working hours', async () => {
      await expect(
        service.update(
          'booking-1',
          {
            startAt: '2099-01-01T07:30:00',
            endAt: '2099-01-01T08:30:00',
          },
          requester,
        ),
      ).rejects.toThrow(
        new BadRequestException('Bookings must be within working hours (08:00 to 18:00)'),
      );

      expect(bookingRepository.checkAvailability).not.toHaveBeenCalled();
    });

    it('allows valid in-hours time updates to continue availability checks', async () => {
      // Service.update only persists status today; this test ensures the new guard
      // does not block valid time updates before availability validation runs.
      await service.update(
        'booking-1',
        {
          startAt: '2099-01-01T10:00:00',
          endAt: '2099-01-01T11:00:00',
          status: 'CONFIRMED' as any,
        },
        requester,
      );

      expect(bookingRepository.checkAvailability).toHaveBeenCalledWith(
        'room-1',
        new Date('2099-01-01T10:00:00'),
        new Date('2099-01-01T11:00:00'),
      );
    });
  });
});
