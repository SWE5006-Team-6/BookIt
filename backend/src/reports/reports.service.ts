import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { ReportStrategy } from './report-strategy.interface';
import { REPORT_TYPES } from './report-types';
import type { ReportType } from './report-types';
import { RoomNoShowReportStrategy } from './strategies/room-no-show-report.strategy';
import { RoomUtilisationReportStrategy } from './strategies/room-utilisation-report.strategy';
import type {
  RoomNoShowReport,
  RoomUtilisationReport,
} from './types/monthly-report.types';

@Injectable()
export class ReportsService {
  private readonly strategies: Map<ReportType, ReportStrategy>;

  constructor(
    roomUtilisationStrategy: RoomUtilisationReportStrategy,
    roomNoShowStrategy: RoomNoShowReportStrategy,
  ) {
    this.strategies = new Map<ReportType, ReportStrategy>();
    this.strategies.set(roomUtilisationStrategy.type, roomUtilisationStrategy);
    this.strategies.set(roomNoShowStrategy.type, roomNoShowStrategy);
  }

  async getRoomUtilisationReport(
    month?: string,
    now?: Date,
  ): Promise<RoomUtilisationReport> {
    return this.getStrategy<RoomUtilisationReport>(
      REPORT_TYPES.ROOM_UTILISATION,
    ).generate(month, now);
  }

  async getRoomNoShowReport(
    month?: string,
    now?: Date,
  ): Promise<RoomNoShowReport> {
    return this.getStrategy<RoomNoShowReport>(
      REPORT_TYPES.ROOM_NO_SHOW,
    ).generate(month, now);
  }

  private getStrategy<TReport>(type: ReportType): ReportStrategy<TReport> {
    const strategy = this.strategies.get(type);

    if (!strategy) {
      throw new InternalServerErrorException(
        `Report strategy "${type}" is not configured`,
      );
    }

    return strategy as ReportStrategy<TReport>;
  }
}
