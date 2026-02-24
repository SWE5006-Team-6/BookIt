import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GmailProvider } from './providers/gmail.provider';

@Module({
  providers: [GmailProvider, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
