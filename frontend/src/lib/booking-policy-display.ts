export interface BookingPolicy {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  isActive: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface UserFacingBookingPolicy {
  key: string;
  title: string;
  summary: string;
  detail: string;
}

type PolicyDefinition = {
  title: string;
  summary: string;
  renderDetail: (value: number) => string;
};

const POLICY_DEFINITIONS: Record<string, PolicyDefinition> = {
  min_duration_minutes: {
    title: 'Minimum booking duration',
    summary: 'Bookings must meet the shortest allowed slot length.',
    renderDetail: (value) => `Minimum booking duration: ${formatMinutes(value)}`,
  },
  max_duration_minutes: {
    title: 'Maximum booking duration',
    summary: 'Bookings cannot exceed the longest allowed session length.',
    renderDetail: (value) => `Maximum booking duration: ${formatMinutes(value)}`,
  },
  max_advance_days: {
    title: 'Advance booking window',
    summary: 'Rooms can only be reserved a limited number of days ahead.',
    renderDetail: (value) => `Book up to ${formatCount(value, 'day')} in advance`,
  },
  max_active_bookings_per_user: {
    title: 'Active booking limit',
    summary: 'Users can only hold a set number of active bookings at once.',
    renderDetail: (value) => `Up to ${formatCount(value, 'active booking')} at one time`,
  },
  no_show_grace_minutes: {
    title: 'Check-in grace period',
    summary: 'Late check-ins are only allowed for a short window after the booking starts.',
    renderDetail: (value) => `Check in within ${formatMinutes(value)} of the start time`,
  },
};

export function toUserFacingBookingPolicies(
  policies: BookingPolicy[],
): UserFacingBookingPolicy[] {
  return policies
    .filter((policy) => policy.isActive)
    .flatMap((policy) => {
      const definition = POLICY_DEFINITIONS[policy.key];
      if (!definition) {
        return [];
      }

      const numericValue = Number(policy.value);
      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return [];
      }

      return [{
        key: policy.key,
        title: definition.title,
        summary: definition.summary,
        detail: definition.renderDetail(numericValue),
      }];
    });
}

function formatMinutes(value: number) {
  if (value % 60 === 0 && value >= 60) {
    return formatCount(value / 60, 'hour');
  }
  return formatCount(value, 'minute');
}

function formatCount(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}
