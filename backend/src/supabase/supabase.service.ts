import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;
  private readonly url: string;
  /** Publishable key (preferred) or legacy anon key – used for MFA user-context client */
  private readonly publicKey: string;

  constructor(private configService: ConfigService) {
    this.url = this.configService.getOrThrow<string>('SUPABASE_URL');
    this.publicKey =
      this.configService.get<string>('SUPABASE_PUBLISHABLE_KEY') ??
      this.configService.get<string>('SUPABASE_ANON_KEY') ??
      '';
    if (!this.publicKey) {
      throw new Error(
        'Set SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY) for MFA. Supabase Dashboard → Project Settings → API.',
      );
    }
    this.client = createClient(this.url, this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'));
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Client using the public (publishable/anon) key only. Use for signInWithPassword
   * so the session is issued with correct AAL and MFA is required when enrolled.
   */
  getPublicClient(): SupabaseClient {
    return createClient(this.url, this.publicKey);
  }

  /**
   * Creates a Supabase client that acts as the signed-in user (for MFA operations).
   * Uses SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) so auth methods run in user context.
   */
  getClientWithUserToken(accessToken: string): SupabaseClient {
    return createClient(this.url, this.publicKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }
}
