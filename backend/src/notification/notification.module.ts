import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { GmailProvider } from './providers/gmail.provider';
import { EMAIL_PROVIDER } from './types/email-provider.types';
import { BookingConfirmedEmailTemplate } from './templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from './templates/booking-cancelled-email.template';

const REQUIRED_GMAIL_KEYS = [
  'GMAIL_USER',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
] as const;

function getMissingGmailKeys(config: ConfigService): string[] {
  return REQUIRED_GMAIL_KEYS.filter((key) => !config.get<string>(key));
}

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService) => {
        const missingKeys = getMissingGmailKeys(config);
        if (missingKeys.length > 0) {
          throw new Error(
            `Gmail configuration is incomplete. Missing: ${missingKeys.join(', ')}`,
          );
        }

        return new GmailProvider(config);
      },
      inject: [ConfigService],
    },
    BookingConfirmedEmailTemplate,
    BookingCancelledEmailTemplate,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
