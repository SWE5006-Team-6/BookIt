import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from '../../../src/reports/reports.controller';
import { ReportsService } from '../../../src/reports/reports.service';
import { SupabaseAuthGuard } from '../../../src/auth/guards/supabase-auth.guard';
import { RolesGuard } from '../../../src/auth/guards/roles.guard';

describe('ReportsController', () => {
  let controller: ReportsController;
  let reportsService: ReportsService;

  const reportResult = {
    period: {
      month: '2026-03',
      startAt: '2026-03-01T00:00:00.000Z',
      endAt: '2026-04-01T00:00:00.000Z',
    },
    summary: {
      totalRooms: 1,
      activeRooms: 1,
      overallUtilisationPct: 12.5,
      totalBookingCount: 4,
      totalCheckedInCount: 2,
      totalReleasedCount: 1,
    },
    rooms: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getRoomUtilisationReport: jest.fn().mockResolvedValue(reportResult),
            getRoomNoShowReport: jest.fn().mockResolvedValue(reportResult),
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportsController>(ReportsController);
    reportsService = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates room report generation', async () => {
    const result = await controller.getRoomUtilisationReport('2026-03');

    expect(reportsService.getRoomUtilisationReport).toHaveBeenCalledWith('2026-03');
    expect(result).toEqual(reportResult);
  });

  it('passes through an omitted month query', async () => {
    await controller.getRoomUtilisationReport(undefined);

    expect(reportsService.getRoomUtilisationReport).toHaveBeenCalledWith(undefined);
  });

  it('delegates room no-show report generation', async () => {
    const result = await controller.getRoomNoShowReport('2026-03');

    expect(reportsService.getRoomNoShowReport).toHaveBeenCalledWith('2026-03');
    expect(result).toEqual(reportResult);
  });

  it('passes through an omitted month query for the no-show report', async () => {
    await controller.getRoomNoShowReport(undefined);

    expect(reportsService.getRoomNoShowReport).toHaveBeenCalledWith(undefined);
  });

  it('propagates service errors', async () => {
    (reportsService.getRoomUtilisationReport as jest.Mock).mockRejectedValueOnce(
      new Error('report failed'),
    );

    await expect(controller.getRoomUtilisationReport('2026-03')).rejects.toThrow(
      'report failed',
    );
  });

  it('propagates no-show report service errors', async () => {
    (reportsService.getRoomNoShowReport as jest.Mock).mockRejectedValueOnce(
      new Error('report failed'),
    );

    await expect(controller.getRoomNoShowReport('2026-03')).rejects.toThrow(
      'report failed',
    );
  });
});
