describe('BookingPolicy decorator helper branches', () => {
  it('loads booking-policy modules with Reflect.decorate and Reflect.metadata available', () => {
    const reflectAny = Reflect as any;
    const originalDecorate = reflectAny.decorate;
    const originalMetadata = reflectAny.metadata;

    try {
      require('reflect-metadata');
      expect(typeof reflectAny.decorate).toBe('function');
      expect(typeof reflectAny.metadata).toBe('function');

      jest.isolateModules(() => {
        require('../../../src/booking-policy/booking-policy.controller');
        require('../../../src/booking-policy/booking-policy.repository');
        require('../../../src/booking-policy/booking-policy.service');
        require('../../../src/booking-policy/handlers/booking-policy-chain.service');
        require('../../../src/booking-policy/handlers/max-bookings-per-user.handler');
      });
    } finally {
      reflectAny.decorate = originalDecorate;
      reflectAny.metadata = originalMetadata;
    }
  });
});
