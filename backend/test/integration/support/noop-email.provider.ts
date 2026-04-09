import { Injectable } from '@nestjs/common';
import type { EmailProvider } from '../../../src/notification/types/email-provider.types';
import type { EmailPayload } from '../../../src/notification/types/email.types';

@Injectable()
export class NoopEmailProvider implements EmailProvider {
  async send(_payload: EmailPayload): Promise<void> {}
}
