import { BookingPolicyController } from '../../../src/booking-policy/booking-policy.controller';
import { BookingPolicyService } from '../../../src/booking-policy/booking-policy.service';

describe('BookingPolicyController', () => {
  const mockService = {
    findAll: jest.fn(),
    update: jest.fn(),
  };

  let controller: BookingPolicyController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BookingPolicyController(
      mockService as unknown as BookingPolicyService,
    );
  });

  it('findAll returns all policies', async () => {
    const policies = [{ key: 'max_duration_minutes', value: '120' }];
    mockService.findAll.mockResolvedValue(policies);

    await expect(controller.findAll()).resolves.toEqual(policies);
    expect(mockService.findAll).toHaveBeenCalledTimes(1);
  });

  it('update forwards key, dto, and current user id to service', async () => {
    const updated = { key: 'max_duration_minutes', value: '90', isActive: true };
    mockService.update.mockResolvedValue(updated);
    const user = { id: 'admin-1' } as any;
    const dto = { value: '90', isActive: true };

    await expect(
      controller.update('max_duration_minutes', dto, user),
    ).resolves.toEqual(updated);
    expect(mockService.update).toHaveBeenCalledWith(
      'max_duration_minutes',
      dto,
      'admin-1',
    );
  });

  it('loads controller module when Reflect decorator helpers are unavailable', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      reflectAny.decorate = undefined;
      reflectAny.metadata = undefined;

      jest.isolateModules(() => {
        const mod = require('../../../src/booking-policy/booking-policy.controller');
        expect(mod.BookingPolicyController).toBeDefined();
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
