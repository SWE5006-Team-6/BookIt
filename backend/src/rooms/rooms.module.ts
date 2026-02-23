import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from './rooms.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RoomValidatorService } from './validation/room-validator.service';
import { CapacityConstraintStrategy } from './validation/capacity-constraint.strategy';
import { NameUniquenessStrategy } from './validation/name-uniqueness.strategy';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsRepository,
    RoomValidatorService,
    CapacityConstraintStrategy,
    NameUniquenessStrategy,
  ],
  exports: [RoomsService, RoomsRepository],
})
export class RoomsModule {}
