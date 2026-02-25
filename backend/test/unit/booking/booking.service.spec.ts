import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus, UserRole } from '@prisma/client';
import { BookingRepository } from '../../../src/booking/booking.repository';
import { BookingService } from '../../../src/booking/booking.service';
import { BookingPolicyChainService } from '../../../src/booking-policy/handlers/booking-policy-chain.service';
import { NotificationService } from '../../../src/notification/notification.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: {
    findAll: jest.Mock;
    findByRoomId: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
    checkAvailability: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    cancel: jest.Mock;
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

  const activeRoom = {
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

  const userRequester = {
    id: 'user-1',
    role: UserRole.USER,
  } as const;
  const otherRequester = { id: 'user-2', role: UserRole.USER } as const;
  const adminRequester = { id: 'admin-1', role: UserRole.ADMIN } as const;

  const bookingEntity = {
    id: 'booking-1',
    roomId: 'room-1',
    bookedById: 'user-1',
    title: 'Planning',
    startAt: new Date('2099-01-01T09:00:00'),
    endAt: new Date('2099-01-01T10:00:00'),
    status: BookingStatus.CONFIRMED,
    cancelReason: null,
    room: { name: 'Room A' },
    bookedBy: { email: 'user@example.com', displayName: 'User Name' },
  };
  const createdBooking = {
    ...bookingEntity,
    id: 'booking-created',
  };
  const updatedBooking = {
    ...bookingEntity,
    id: 'booking-updated',
    title: 'Planning (Updated)',
  };
  const cancelledBooking = {
    ...bookingEntity,
    id: 'booking-cancelled',
    status: BookingStatus.CANCELLED,
  };

  const validCreateDto = {
    roomId: 'room-1',
    title: 'Planning',
    startAt: '2099-01-01T09:00:00',
    endAt: '2099-01-01T10:00:00',
  };

  beforeEach(async () => {
    bookingRepository = {
      findAll: jest.fn().mockResolvedValue([bookingEntity]),
      findByRoomId: jest.fn().mockResolvedValue([bookingEntity]),
      findByUserId: jest.fn().mockResolvedValue([bookingEntity]),
      findById: jest.fn().mockResolvedValue(bookingEntity),
      checkAvailability: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue(createdBooking),
      update: jest.fn().mockResolvedValue(updatedBooking),
      cancel: jest.fn().mockResolvedValue(cancelledBooking),
    };

    prisma = {
      room: {
        findUnique: jest.fn().mockResolvedValue(activeRoom),
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

  const createBooking = (dto = validCreateDto, bookedById = 'user-1') =>
    service.create(dto, bookedById);

  const updateBooking = (
    dto: Parameters<BookingService['update']>[1],
    requester: Parameters<BookingService['update']>[2] = userRequester,
    id = 'booking-1',
  ) => service.update(id, dto, requester);

  const cancelBooking = (
    reason: string | undefined,
    requester: Parameters<BookingService['cancel']>[2] = userRequester,
    id = 'booking-1',
  ) => service.cancel(id, reason, requester);

  describe('authorization for read methods', () => {
    it.each([userRequester, adminRequester])(
      'allows findByUserId for requester %j',
      async (requester) => {
        await service.findByUserId('user-1', requester);
        expect(bookingRepository.findByUserId).toHaveBeenCalledWith('user-1');
      },
    );

    it('rejects findByUserId for non-owner non-admin', async () => {
      await expect(service.findByUserId('user-1', otherRequester)).rejects.toThrow(
        new ForbiddenException('You do not have permission to access these bookings'),
      );
    });

    it.each([userRequester, adminRequester])(
      'allows findById for requester %j',
      async (requester) => {
        expect(await service.findById('booking-1', requester)).toEqual(bookingEntity);
      },
    );

    it('rejects findById when booking not found', async () => {
      bookingRepository.findById.mockResolvedValue(null);
      await expect(service.findById('missing', userRequester)).rejects.toThrow(
        new NotFoundException('Booking with ID missing not found'),
      );
    });

    it('rejects findById for non-owner non-admin', async () => {
      await expect(service.findById('booking-1', otherRequester)).rejects.toThrow(
        new ForbiddenException('You do not have permission to access this booking'),
      );
    });
  });

  describe('create', () => {
    it('creates confirmed booking and sends notification', async () => {
      await createBooking();

      expect(prisma.room.findUnique).toHaveBeenCalledWith({ where: { id: 'room-1' } });
      expect(policyChain.validate).toHaveBeenCalled();
      expect(bookingRepository.checkAvailability).toHaveBeenCalled();
      expect(bookingRepository.create).toHaveBeenCalled();
      expect(notificationService.sendBookingConfirmedEmail).toHaveBeenCalledWith({
        email: 'user@example.com',
        name: 'User Name',
        roomName: 'Room A',
        title: 'Planning',
        startAt: new Date('2099-01-01T09:00:00'),
        endAt: new Date('2099-01-01T10:00:00'),
        cancelReason: undefined,
      });
    });

    it('does not send notification for non-confirmed status', async () => {
      bookingRepository.create.mockResolvedValue({
        ...bookingEntity,
        status: BookingStatus.CANCELLED,
      });

      const result = await createBooking(
        { ...validCreateDto, status: BookingStatus.CANCELLED },
        'user-1',
      );

      expect(bookingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: BookingStatus.CANCELLED }),
      );
      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(notificationService.sendBookingConfirmedEmail).not.toHaveBeenCalled();
    });

    it('skips notification when booking user email is missing', async () => {
      bookingRepository.create.mockResolvedValue({
        ...bookingEntity,
        bookedBy: { email: null, displayName: 'User Name' },
      });

      await createBooking();

      expect(notificationService.sendBookingConfirmedEmail).not.toHaveBeenCalled();
    });

    it.each([
      {
        name: 'startAt is not before endAt',
        dto: {
          roomId: 'room-1',
          title: 'Invalid',
          startAt: '2099-01-01T10:00:00',
          endAt: '2099-01-01T10:00:00',
        },
        message: 'Start time must be before end time',
      },
      {
        name: 'booking is in the past',
        dto: {
          roomId: 'room-1',
          title: 'Invalid',
          startAt: '2000-01-01T09:00:00',
          endAt: '2000-01-01T10:00:00',
        },
        message: 'Cannot book in the past',
      },
      {
        name: 'outside working hours',
        dto: {
          roomId: 'room-1',
          title: 'Invalid',
          startAt: '2099-01-01T07:30:00',
          endAt: '2099-01-01T08:30:00',
        },
        message: 'Bookings must be within working hours (08:00 to 18:00)',
      },
      {
        name: 'booking spans multiple days',
        dto: {
          roomId: 'room-1',
          title: 'Invalid',
          startAt: '2099-01-01T17:30:00',
          endAt: '2099-01-02T08:30:00',
        },
        message: 'Bookings must start and end on the same day',
      },
    ])('rejects when $name', async ({ dto, message }) => {
      await expect(createBooking(dto)).rejects.toThrow(new BadRequestException(message));
    });

    it('rejects when room does not exist', async () => {
      prisma.room.findUnique.mockResolvedValue(null);
      await expect(createBooking()).rejects.toThrow(new NotFoundException('Room not found'));
    });

    it('rejects when room cannot be booked by room state', async () => {
      prisma.room.findUnique.mockResolvedValue({
        ...activeRoom,
        isAvailable: false,
      });
      await expect(createBooking()).rejects.toThrow(
        new BadRequestException('Room is currently maintenance and cannot be booked'),
      );
    });

    it('rejects when room has overlap', async () => {
      bookingRepository.checkAvailability.mockResolvedValue(false);
      await expect(createBooking()).rejects.toThrow(
        new BadRequestException('Room is not available for the selected time slot'),
      );
    });
  });

  describe('update', () => {
    it('rejects when target booking does not exist', async () => {
      bookingRepository.findById.mockResolvedValue(null);
      await expect(
        updateBooking({ status: BookingStatus.CONFIRMED }, userRequester, 'missing'),
      ).rejects.toThrow(new NotFoundException('Booking with ID missing not found'));
    });

    it('rejects for non-owner non-admin requester', async () => {
      await expect(
        updateBooking({ status: BookingStatus.CONFIRMED }, otherRequester),
      ).rejects.toThrow(
        new ForbiddenException('You do not have permission to access this booking'),
      );
    });

    it('updates status without checking availability when times are unchanged', async () => {
      await updateBooking({ status: BookingStatus.CANCELLED });

      expect(bookingRepository.checkAvailability).not.toHaveBeenCalled();
      expect(bookingRepository.update).toHaveBeenCalledWith('booking-1', {
        status: BookingStatus.CANCELLED,
      });
    });

    it('checks availability when updating both startAt and endAt', async () => {
      await updateBooking({
        startAt: '2099-01-01T10:00:00',
        endAt: '2099-01-01T11:00:00',
        status: BookingStatus.CONFIRMED,
      });

      expect(bookingRepository.checkAvailability).toHaveBeenCalledWith(
        'room-1',
        new Date('2099-01-01T10:00:00'),
        new Date('2099-01-01T11:00:00'),
      );
    });

    it.each([
      {
        name: 'startAt is not before endAt',
        dto: { startAt: '2099-01-01T11:00:00', endAt: '2099-01-01T10:00:00' },
        message: 'Start time must be before end time',
      },
      {
        name: 'outside working hours',
        dto: { startAt: '2099-01-01T07:30:00', endAt: '2099-01-01T08:30:00' },
        message: 'Bookings must be within working hours (08:00 to 18:00)',
      },
    ])('rejects update when $name', async ({ dto, message }) => {
      await expect(updateBooking(dto)).rejects.toThrow(
        new BadRequestException(message),
      );
    });

    it('rejects update when new times overlap', async () => {
      bookingRepository.checkAvailability.mockResolvedValue(false);

      await expect(
        updateBooking({ startAt: '2099-01-01T10:00:00', endAt: '2099-01-01T11:00:00' }),
      ).rejects.toThrow(
        new BadRequestException('Room is not available for the selected time slot'),
      );
    });
  });

  describe('cancel', () => {
    it('cancels booking and sends cancellation notification', async () => {
      await cancelBooking('No longer needed');

      expect(bookingRepository.cancel).toHaveBeenCalledWith(
        'booking-1',
        'No longer needed',
      );
      expect(notificationService.sendBookingCancelledEmail).toHaveBeenCalled();
    });

    it.each([
      {
        name: 'booking does not exist',
        prepare: () => bookingRepository.findById.mockResolvedValue(null),
        requester: userRequester,
        message: 'Booking with ID booking-1 not found',
      },
      {
        name: 'requester is not owner/admin',
        prepare: () => bookingRepository.findById.mockResolvedValue(bookingEntity),
        requester: otherRequester,
        message: 'You do not have permission to access this booking',
      },
      {
        name: 'booking is already cancelled',
        prepare: () =>
          bookingRepository.findById.mockResolvedValue({
            ...bookingEntity,
            status: BookingStatus.CANCELLED,
          }),
        requester: userRequester,
        message: 'Booking is already cancelled',
      },
    ])('rejects cancel when $name', async ({ prepare, requester, message }) => {
      prepare();
      await expect(cancelBooking(undefined, requester)).rejects.toThrow(message);
    });

  });
});