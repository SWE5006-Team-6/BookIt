import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('rooms')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getRoomUtilisationReport(@Query('month') month?: string) {
    return this.reportsService.getRoomUtilisationReport(month);
  }
}
