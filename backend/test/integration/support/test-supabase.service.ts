import { Injectable } from '@nestjs/common';

@Injectable()
export class TestSupabaseService {
  getClient() {
    return {
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: { message: 'Supabase is stubbed in integration tests' },
        }),
      },
    };
  }

  getPublicClient() {
    return {};
  }

  getClientWithUserToken(_accessToken: string) {
    return {};
  }
}
