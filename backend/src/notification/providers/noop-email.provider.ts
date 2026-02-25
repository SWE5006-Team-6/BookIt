import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from '../types/email-provider.types';
import { EmailPayload } from '../types/email.types';

/**
 * No-op email provider used when Gmail is not configured (e.g. on EC2 without GMAIL_* env).
 * Booking confirmations/cancellations will not send real emails; they are only logged.
 */
@Injectable()
export class NoOpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(NoOpEmailProvider.name);

  async send(payload: EmailPayload): Promise<void> {
    this.logger.log(
      `[NoOp] Email not sent (Gmail not configured): to=${payload.to} subject=${payload.subject}`,
    );
  }
}
