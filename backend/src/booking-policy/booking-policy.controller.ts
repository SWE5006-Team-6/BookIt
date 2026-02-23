import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { BookingPolicyService } from './booking-policy.service';
import { UpdateBookingPolicyDto } from './dto/update-booking-policy.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('booking-policies')
export class BookingPolicyController {
  constructor(private readonly service: BookingPolicyService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':key')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('key') key: string,
    @Body() dto: UpdateBookingPolicyDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(key, dto, user.id);
  }
}
