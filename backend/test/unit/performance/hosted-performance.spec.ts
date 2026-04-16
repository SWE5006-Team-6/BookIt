import {
  buildHostedRunTag,
  canSeedHostedCheckIns,
  toHostedApiBaseUrl,
} from '../../performance/support/hosted-performance';

describe('hosted performance helpers', () => {
  it('builds hosted API base URL from a staging origin', () => {
    expect(
      toHostedApiBaseUrl('https://swe5006-t6-stg.duckdns.org/'),
    ).toBe('https://swe5006-t6-stg.duckdns.org/api');
  });

  it('builds perf run tags with the configured prefix and run id', () => {
    expect(buildHostedRunTag('[PERF]', '12345')).toBe('[PERF][run-12345]');
  });

  it('allows hosted check-in fixtures during a valid Singapore business window', () => {
    expect(
      canSeedHostedCheckIns(
        new Date('2099-01-01T17:30:00+08:00'),
        30,
      ),
    ).toBe(true);
  });

  it('disables hosted check-in fixtures once the remaining workday is too short', () => {
    expect(
      canSeedHostedCheckIns(
        new Date('2099-01-01T17:31:00+08:00'),
        30,
      ),
    ).toBe(false);
  });
});
