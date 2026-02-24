import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_PROVIDER } from '../../../src/notification/types/email-provider.types';
import { NotificationModule } from '../../../src/notification/notification.module';
import { NotificationService } from '../../../src/notification/notification.service';
import { GmailProvider } from '../../../src/notification/providers/gmail.provider';
import { BookingConfirmedEmailTemplate } from '../../../src/notification/templates/booking-confirmed-email.template';
import { BookingCancelledEmailTemplate } from '../../../src/notification/templates/booking-cancelled-email.template';

describe('NotificationModule', () => {
  it('should wire providers and alias token correctly', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              GMAIL_USER: 'sender@example.com',
              GMAIL_CLIENT_ID: 'client-id',
              GMAIL_CLIENT_SECRET: 'client-secret',
              GMAIL_REFRESH_TOKEN: 'refresh-token',
            }),
          ],
        }),
        NotificationModule,
      ],
    })
      .compile();

    const notificationService = module.get(NotificationService);
    const gmailProvider = module.get(GmailProvider);
    const emailProviderAlias = module.get(EMAIL_PROVIDER);
    const confirmedTemplate = module.get(BookingConfirmedEmailTemplate);
    const cancelledTemplate = module.get(BookingCancelledEmailTemplate);

    expect(notificationService).toBeDefined();
    expect(gmailProvider).toBeDefined();
    expect(confirmedTemplate).toBeDefined();
    expect(cancelledTemplate).toBeDefined();
    expect(emailProviderAlias).toBe(gmailProvider);
  });
});
