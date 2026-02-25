describe('room-validation.strategy module', () => {
  it('loads the strategy module', () => {
    jest.isolateModules(() => {
      expect(() =>
        require('../../../../src/rooms/validation/room-validation.strategy'),
      ).not.toThrow();
    });
  });
});
