import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { SettingsPage } from '../../../src/pages/SettingsPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'jwt-token' });
  });

  it('shows enable 2FA action when no factors exist', async () => {
    (apiRequest as any).mockResolvedValueOnce({ totp: [], phone: [] });
    renderWithProviders(<SettingsPage />);
    expect(await screen.findByRole('button', { name: /enable 2fa with google authenticator/i })).toBeInTheDocument();
  });

  it('starts enrollment and validates confirm error fallback', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce({ totp: [], phone: [] })
      .mockResolvedValueOnce({ factorId: 'f1', qrCode: '<svg></svg>', secret: 'ABC' })
      .mockRejectedValueOnce('invalid code');

    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(await screen.findByRole('button', { name: /enable 2fa with google authenticator/i }));
    expect(await screen.findByText(/scan the qr code/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('000000'), '12a34567');
    expect(screen.getByPlaceholderText('000000')).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: /enable 2fa/i }));
    expect(await screen.findByText(/invalid code/i)).toBeInTheDocument();
  });

  it('handles successful enroll confirmation and refreshes factors', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce({ totp: [], phone: [] })
      .mockResolvedValueOnce({ factorId: 'f1', qrCode: 'data:image/svg+xml,abc' })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ totp: [{ id: 'f1' }], phone: [] });

    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await user.click(await screen.findByRole('button', { name: /enable 2fa with google authenticator/i }));
    await user.type(screen.getByPlaceholderText('000000'), '123456');
    await user.click(screen.getByRole('button', { name: /enable 2fa/i }));

    expect(await screen.findByText(/two-factor authentication is now enabled/i)).toBeInTheDocument();
  });

  it('supports deactivation and respects confirmation cancel', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    (apiRequest as any)
      .mockResolvedValueOnce({ totp: [{ id: 'factor-1' }], phone: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ totp: [], phone: [] });

    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    confirmSpy.mockReturnValueOnce(false);
    await user.click(await screen.findByRole('button', { name: /deactivate 2fa/i }));
    expect(apiRequest).toHaveBeenCalledTimes(1);

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: /deactivate 2fa/i }));
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/auth/mfa/unenroll',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    confirmSpy.mockRestore();
  });

  it('handles no-token factors branch and start enroll failure fallback', async () => {
    mockUseAuth.mockReturnValue({ token: null });
    renderWithProviders(<SettingsPage />);
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();
  });

  it('shows fallback error when start enroll fails with non-Error', async () => {
    mockUseAuth.mockReturnValue({ token: 'jwt-token' });
    (apiRequest as any)
      .mockResolvedValueOnce({ totp: [], phone: [] })
      .mockRejectedValueOnce('bad enroll');
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />);
    await user.click(await screen.findByRole('button', { name: /enable 2fa with google authenticator/i }));
    expect(await screen.findByText(/failed to start enrollment/i)).toBeInTheDocument();
  });
});
