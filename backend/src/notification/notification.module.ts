import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { GmailProvider } from './providers/gmail.provider';
import { NoOpEmailProvider } from './providers/noop-email.provider';
import { EMAIL_PROVIDER } from './types/email-provider.types';
import { BookingConfirmedEmailTemplate } from './templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from './templates/booking-cancelled-email.template';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: ConfigService) =>
        config.get('GMAIL_USER')
          ? new GmailProvider(config)
          : new NoOpEmailProvider(),
      inject: [ConfigService],
    },
    BookingConfirmedEmailTemplate,
    BookingCancelledEmailTemplate,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
