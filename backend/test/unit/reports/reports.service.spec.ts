import { InternalServerErrorException } from '@nestjs/common';
import { REPORT_TYPES } from '../../../src/reports/report-types';
import { ReportsService } from '../../../src/reports/reports.service';

describe('ReportsService', () => {
  it('delegates room utilisation reports to the matching strategy', async () => {
    const roomStrategy = {
      type: REPORT_TYPES.ROOM_UTILISATION,
      generate: jest.fn().mockResolvedValue({ kind: 'rooms' }),
    };
    const noShowStrategy = {
      type: REPORT_TYPES.ROOM_NO_SHOW,
      generate: jest.fn().mockResolvedValue({ kind: 'no-shows' }),
    };

    const service = new ReportsService(roomStrategy as any, noShowStrategy as any);

    const result = await service.getRoomUtilisationReport('2026-03');

    expect(roomStrategy.generate).toHaveBeenCalledWith('2026-03', undefined);
    expect(noShowStrategy.generate).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'rooms' });
  });

  it('delegates no-show reports to the matching strategy', async () => {
    const roomStrategy = {
      type: REPORT_TYPES.ROOM_UTILISATION,
      generate: jest.fn().mockResolvedValue({ kind: 'rooms' }),
    };
    const noShowStrategy = {
      type: REPORT_TYPES.ROOM_NO_SHOW,
      generate: jest.fn().mockResolvedValue({ kind: 'no-shows' }),
    };

    const service = new ReportsService(roomStrategy as any, noShowStrategy as any);

    const result = await service.getRoomNoShowReport('2026-03');

    expect(noShowStrategy.generate).toHaveBeenCalledWith('2026-03', undefined);
    expect(roomStrategy.generate).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: 'no-shows' });
  });

  it('throws if a required strategy is not configured', async () => {
    const roomStrategy = {
      type: REPORT_TYPES.ROOM_UTILISATION,
      generate: jest.fn(),
    };
    const noShowStrategy = {
      type: REPORT_TYPES.ROOM_NO_SHOW,
      generate: jest.fn(),
    };

    const service = new ReportsService(roomStrategy as any, noShowStrategy as any);
    (service as any).strategies.delete(REPORT_TYPES.ROOM_NO_SHOW);

    await expect(service.getRoomNoShowReport('2026-03')).rejects.toThrow(
      new InternalServerErrorException(
        'Report strategy "no-shows" is not configured',
      ),
    );
  });
});
