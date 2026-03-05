describe('Notification metadata branch coverage', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../../../src/notification/templates/booking-confirmed-email.template');
    jest.dontMock('../../../src/notification/templates/booking-cancelled-email.template');
    jest.dontMock('../../../src/notification/templates/booking-released-email.template');
    jest.dontMock('@nestjs/config');
  });

  it('should load NotificationService when template types are undefined', () => {
    jest.isolateModules(() => {
      jest.doMock(
        '../../../src/notification/templates/booking-confirmed-email.template',
        () => ({ BookingConfirmedEmailTemplate: undefined }),
      );
      jest.doMock(
        '../../../src/notification/templates/booking-cancelled-email.template',
        () => ({ BookingCancelledEmailTemplate: undefined }),
      );
      jest.doMock(
        '../../../src/notification/templates/booking-released-email.template',
        () => ({ BookingReleasedEmailTemplate: undefined }),
      );

      const mod = require('../../../src/notification/notification.service');
      expect(mod.NotificationService).toBeDefined();
    });
  });

  it('should load GmailProvider when ConfigService type is undefined', () => {
    jest.isolateModules(() => {
      jest.doMock('@nestjs/config', () => ({ ConfigService: undefined }));

      const mod = require('../../../src/notification/providers/gmail.provider');
      expect(mod.GmailProvider).toBeDefined();
    });
  });
});
