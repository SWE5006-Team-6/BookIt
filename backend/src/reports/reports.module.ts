import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MonthlyReportHelper } from './monthly-report.helper';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { RoomNoShowReportStrategy } from './strategies/room-no-show-report.strategy';
import { RoomUtilisationReportStrategy } from './strategies/room-utilisation-report.strategy';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportsController],
  providers: [
    MonthlyReportHelper,
    RoomUtilisationReportStrategy,
    RoomNoShowReportStrategy,
    ReportsService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
