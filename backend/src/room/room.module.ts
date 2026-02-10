import { Module } from '@nestjs/common';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomRepository } from './room.repository';

@Module({
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
  exports: [RoomService, RoomRepository],
})
export class RoomModule {}
