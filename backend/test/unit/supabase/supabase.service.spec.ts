import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../../src/supabase/supabase.service';

// Mock the entire @supabase/supabase-js module so we don't make real HTTP calls
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: { getUser: jest.fn() },
  }),
}));

import { createClient } from '@supabase/supabase-js';

describe('SupabaseService', () => {
  it('should create a Supabase client with the correct config values', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                SUPABASE_URL: 'https://test.supabase.co',
                SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    const service = module.get<SupabaseService>(SupabaseService);

    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key',
    );

    expect(service.getClient()).toBeDefined();
  });

  it('should throw when SUPABASE_URL is missing', async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SUPABASE_URL') {
          throw new Error('Config key "SUPABASE_URL" is missing');
        }
        return 'some-value';
      }),
    };

    await expect(
      Test.createTestingModule({
        providers: [
          SupabaseService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile(),
    ).rejects.toThrow('SUPABASE_URL');
  });

  it('should throw when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    const mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') {
          throw new Error('Config key "SUPABASE_SERVICE_ROLE_KEY" is missing');
        }
        return 'https://test.supabase.co';
      }),
    };

    await expect(
      Test.createTestingModule({
        providers: [
          SupabaseService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile(),
    ).rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });
});
