import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingPolicyService } from '../../../src/booking-policy/booking-policy.service';
import { BookingPolicyRepository } from '../../../src/booking-policy/booking-policy.repository';

const mockRepository = {
  findAll: jest.fn(),
  findByKey: jest.fn(),
  findActive: jest.fn(),
  upsert: jest.fn(),
  deleteByKey: jest.fn(),
  updateByKey: jest.fn(),
  count: jest.fn(),
};

describe('BookingPolicyService', () => {
  let service: BookingPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingPolicyService(
      mockRepository as unknown as BookingPolicyRepository,
    );
  });

  describe('findAll', () => {
    it('should return all policies', async () => {
      const policies = [
        { key: 'max_duration_minutes', value: '120', isActive: true },
      ];
      mockRepository.findAll.mockResolvedValue(policies);

      const result = await service.findAll();
      expect(result).toEqual(policies);
      expect(mockRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('should return active policies', async () => {
      const active = [{ key: 'max_duration_minutes', value: '120', isActive: true }];
      mockRepository.findActive.mockResolvedValue(active);

      const result = await service.findActive();
      expect(result).toEqual(active);
      expect(mockRepository.findActive).toHaveBeenCalled();
    });
  });

  describe('findByKey', () => {
    it('should return a policy by key', async () => {
      const policy = { key: 'max_duration_minutes', value: '120' };
      mockRepository.findByKey.mockResolvedValue(policy);

      const result = await service.findByKey('max_duration_minutes');
      expect(result).toEqual(policy);
    });

    it('should throw NotFoundException for unknown key', async () => {
      mockRepository.findByKey.mockResolvedValue(null);

      await expect(service.findByKey('unknown_key')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a policy value', async () => {
      const existing = { key: 'max_duration_minutes', value: '120', isActive: true };
      const updated = { ...existing, value: '60' };
      mockRepository.findByKey.mockResolvedValue(existing);
      mockRepository.updateByKey.mockResolvedValue(updated);

      const result = await service.update(
        'max_duration_minutes',
        { value: '60' },
        'admin-1',
      );
      expect(result.value).toBe('60');
      expect(mockRepository.updateByKey).toHaveBeenCalledWith(
        'max_duration_minutes',
        { value: '60', isActive: undefined, updatedBy: 'admin-1' },
      );
    });

    it('should throw NotFoundException for unknown key', async () => {
      mockRepository.findByKey.mockResolvedValue(null);

      await expect(
        service.update('unknown_key', { value: '10' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for negative values', async () => {
      const existing = { key: 'max_duration_minutes', value: '120' };
      mockRepository.findByKey.mockResolvedValue(existing);

      await expect(
        service.update('max_duration_minutes', { value: '-5' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-numeric values', async () => {
      const existing = { key: 'max_duration_minutes', value: '120' };
      mockRepository.findByKey.mockResolvedValue(existing);

      await expect(
        service.update('max_duration_minutes', { value: 'abc' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update isActive toggle', async () => {
      const existing = { key: 'max_duration_minutes', value: '120', isActive: true };
      const updated = { ...existing, isActive: false };
      mockRepository.findByKey.mockResolvedValue(existing);
      mockRepository.updateByKey.mockResolvedValue(updated);

      const result = await service.update(
        'max_duration_minutes',
        { isActive: false },
        'admin-1',
      );
      expect(result.isActive).toBe(false);
    });
  });

  describe('seedDefaults', () => {
    it('should upsert only missing default policies', async () => {
      mockRepository.findByKey.mockImplementation(async (key: string) =>
        key === 'max_duration_minutes' ? { key, value: '999', isActive: true } : null,
      );
      mockRepository.upsert.mockResolvedValue({});

      await service.seedDefaults();

      expect(mockRepository.upsert).toHaveBeenCalledTimes(4);
      expect(mockRepository.deleteByKey).not.toHaveBeenCalled();
    });

    it('should skip upsert when policies already exist', async () => {
      mockRepository.findByKey.mockResolvedValue({ key: 'any', value: '1', isActive: true });
      mockRepository.upsert.mockResolvedValue({});

      await service.seedDefaults();

      expect(mockRepository.upsert).not.toHaveBeenCalled();
      expect(mockRepository.deleteByKey).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should call seedDefaults', async () => {
      const spy = jest
        .spyOn(service, 'seedDefaults')
        .mockResolvedValue(undefined as never);

      await service.onModuleInit();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
