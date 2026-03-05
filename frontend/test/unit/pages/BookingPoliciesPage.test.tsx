import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import BookingPoliciesPage from '../../../src/pages/BookingPoliciesPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const policies = [
  {
    id: '1',
    key: 'min_duration_minutes',
    value: '30',
    label: 'Min Duration',
    description: 'Minimum booking duration',
    isActive: true,
    updatedBy: null,
    updatedAt: '2099-01-01',
  },
];

describe('BookingPoliciesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'jwt-token' });
  });

  it('loads and renders booking policies', async () => {
    (apiRequest as any).mockResolvedValue(policies);
    renderWithProviders(<BookingPoliciesPage />);
    expect(await screen.findByText('Min Duration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30')).toBeInTheDocument();
  });

  it('shows error message when loading policies fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockRejectedValue(new Error('load failed'));
    renderWithProviders(<BookingPoliciesPage />);
    expect(await screen.findByText(/failed to load booking policies/i)).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('validates non-negative numeric value before save', async () => {
    (apiRequest as any).mockResolvedValue(policies);
    const user = userEvent.setup();
    renderWithProviders(<BookingPoliciesPage />);

    const input = await screen.findByDisplayValue('30');
    await user.clear(input);
    await user.type(input, '-1');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText(/non-negative number/i)).toBeInTheDocument();
  });

  it('saves policy changes and supports reset', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(policies)
      .mockResolvedValueOnce({ ...policies[0], value: '45' });

    const user = userEvent.setup();
    renderWithProviders(<BookingPoliciesPage />);

    const input = await screen.findByDisplayValue('30');
    await user.clear(input);
    await user.type(input, '45');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/booking-policies/min_duration_minutes',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    await user.clear(input);
    await user.type(input, '40');
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(input).toHaveValue(45);
  });

  it('shows empty state when no policies are returned', async () => {
    (apiRequest as any).mockResolvedValueOnce([]);
    renderWithProviders(<BookingPoliciesPage />);
    expect(await screen.findByText(/no booking policies found/i)).toBeInTheDocument();
  });

  it('shows fallback error when save fails with non-Error', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce([{ ...policies[0], description: null }])
      .mockRejectedValueOnce('save failed');

    const user = userEvent.setup();
    renderWithProviders(<BookingPoliciesPage />);
    const input = await screen.findByDisplayValue('30');
    await user.clear(input);
    await user.type(input, '40');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/failed to update policy/i)).toBeInTheDocument();
  });

  it('shows API error message when save fails with Error', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(policies)
      .mockRejectedValueOnce(new Error('Policy cannot be changed'));

    const user = userEvent.setup();
    renderWithProviders(<BookingPoliciesPage />);
    const input = await screen.findByDisplayValue('30');
    await user.clear(input);
    await user.type(input, '35');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText(/policy cannot be changed/i)).toBeInTheDocument();
  });

  it('does not show save/reset buttons when nothing changed', async () => {
    (apiRequest as any).mockResolvedValueOnce(policies);
    renderWithProviders(<BookingPoliciesPage />);

    await screen.findByText('Min Duration');
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('allows active toggle update and saves isActive=false', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(policies)
      .mockResolvedValueOnce({ ...policies[0], isActive: false });

    const user = userEvent.setup();
    renderWithProviders(<BookingPoliciesPage />);

    await screen.findByText('Min Duration');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/booking-policies/min_duration_minutes',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.objectContaining({ isActive: false }),
        }),
      );
    });
    expect(await screen.findByText(/updated/i)).toBeInTheDocument();
  });

  it('passes undefined token when auth token is missing', async () => {
    mockUseAuth.mockReturnValue({ token: null });
    (apiRequest as any).mockResolvedValueOnce(policies);

    renderWithProviders(<BookingPoliciesPage />);

    await screen.findByText('Min Duration');
    expect(apiRequest).toHaveBeenCalledWith(
      '/booking-policies',
      expect.objectContaining({ token: undefined }),
    );
  });

  it('schedules auto-dismiss for banner message after timeout', async () => {
    const timeoutSpy = vi.spyOn(global, 'setTimeout');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any).mockRejectedValueOnce(new Error('load failed'));
    renderWithProviders(<BookingPoliciesPage />);

    expect(await screen.findByText(/failed to load booking policies/i)).toBeInTheDocument();
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
    timeoutSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
