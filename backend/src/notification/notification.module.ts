import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GmailProvider } from './providers/gmail.provider';
import { EMAIL_PROVIDER } from './types/email-provider.types';
import { BookingConfirmedEmailTemplate } from './templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from './templates/booking-cancelled-email.template';

@Module({
  providers: [
    GmailProvider,
    { provide: EMAIL_PROVIDER, useExisting: GmailProvider },
    BookingConfirmedEmailTemplate,
    BookingCancelledEmailTemplate,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
