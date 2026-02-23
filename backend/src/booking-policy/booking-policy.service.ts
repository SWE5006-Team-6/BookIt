import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { BookingPolicyRepository } from './booking-policy.repository';
import { UpdateBookingPolicyDto } from './dto/update-booking-policy.dto';

const DEFAULT_POLICIES = [
  {
    key: 'max_duration_minutes',
    value: '120',
    label: 'Maximum Booking Duration (minutes)',
    description:
      'The longest a single booking can last, in minutes. Prevents rooms from being reserved for excessively long periods.',
  },
  {
    key: 'min_duration_minutes',
    value: '30',
    label: 'Minimum Booking Duration (minutes)',
    description:
      'The shortest allowed booking duration, in minutes. Avoids trivially short reservations.',
  },
  {
    key: 'max_advance_days',
    value: '14',
    label: 'Maximum Advance Booking (days)',
    description:
      'How many days in advance a room can be booked. Limits reservations that are too far in the future.',
  },
  {
    key: 'min_advance_minutes',
    value: '30',
    label: 'Minimum Notice Before Booking (minutes)',
    description:
      'The minimum number of minutes before a booking starts that it must be created. Prevents last-minute reservations.',
  },
  {
    key: 'max_active_bookings_per_user',
    value: '5',
    label: 'Maximum Active Bookings Per User',
    description:
      'The maximum number of confirmed (non-cancelled) bookings a single user can hold at the same time.',
  },
];

@Injectable()
export class BookingPolicyService implements OnModuleInit {
  private readonly logger = new Logger(BookingPolicyService.name);

  constructor(private readonly repository: BookingPolicyRepository) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async seedDefaults() {
    const count = await this.repository.count();
    if (count > 0) return;

    this.logger.log('Seeding default booking policies...');
    for (const policy of DEFAULT_POLICIES) {
      await this.repository.upsert(policy);
    }
    this.logger.log(`Seeded ${DEFAULT_POLICIES.length} default booking policies`);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findActive() {
    return this.repository.findActive();
  }

  async findByKey(key: string) {
    const policy = await this.repository.findByKey(key);
    if (!policy) {
      throw new NotFoundException(`Booking policy "${key}" not found`);
    }
    return policy;
  }

  async update(key: string, dto: UpdateBookingPolicyDto, userId: string) {
    const existing = await this.repository.findByKey(key);
    if (!existing) {
      throw new NotFoundException(`Booking policy "${key}" not found`);
    }

    if (dto.value !== undefined) {
      const numVal = Number(dto.value);
      if (isNaN(numVal) || numVal < 0) {
        throw new BadRequestException(
          'Policy value must be a non-negative number',
        );
      }
    }

    return this.repository.updateByKey(key, {
      value: dto.value,
      isActive: dto.isActive,
      updatedBy: userId,
    });
  }
}
