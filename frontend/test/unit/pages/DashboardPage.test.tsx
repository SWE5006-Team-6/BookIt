import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { DashboardPage } from '../../../src/pages/DashboardPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn().mockResolvedValue([]),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext.tsx', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
// Note: your component uses 'react-router', the sample used 'react-router-dom'
// I'll stick to 'react-router' to match your component's import
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DashboardPage', () => {
  const mockUser = {
    id: 'user-1',
    displayName: 'John Doe',
    email: 'john@ncs.com.sg',
    role: 'Employee',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'fake-token',
    });
  });

  it('should render the welcome card with user display name and role', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText(`Welcome, ${mockUser.displayName}`)).toBeInTheDocument();
    expect(await screen.findByText(mockUser.role)).toBeInTheDocument();
  });

  it('should fallback to email if displayName is missing', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, displayName: null },
      token: 'fake-token',
    });

    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
  });

  it('should navigate to /bookings when Manage button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    const manageBtn = screen.getByRole('button', { name: /manage/i });
    await user.click(manageBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/bookings');
  });

  it('should navigate to /rooms when View Rooms button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    const viewRoomsBtn = screen.getByRole('button', { name: /view rooms/i });
    await user.click(viewRoomsBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/rooms');
  });

  it('should navigate to /quick-book when Quick Book button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    const quickBookBtn = screen.getByRole('button', { name: /quick book/i });
    await user.click(quickBookBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/quick-book');
  });

  it('shows admin stats and navigates to admin room management', async () => {
    (apiRequest as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: '1', isActive: true, isAvailable: true },
        { id: '2', isActive: true, isAvailable: false },
        { id: '3', isActive: false, isAvailable: false },
      ])
      .mockResolvedValueOnce([]);

    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'ADMIN' },
      token: 'fake-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Available')).toBeInTheDocument();
    expect(await screen.findByText('Maintenance')).toBeInTheDocument();
    expect(await screen.findByText('Deactivated')).toBeInTheDocument();
    expect((await screen.findAllByText('1')).length).toBeGreaterThanOrEqual(3);

    await user.click(screen.getByRole('button', { name: /go to room management/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/rooms');
  });

  it('navigates to admin reports from the admin dashboard', async () => {
    (apiRequest as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([
        { id: '1', isActive: true, isAvailable: true },
      ])
      .mockResolvedValueOnce([]);

    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'ADMIN' },
      token: 'fake-token',
    });

    const user = userEvent.setup();
    renderWithProviders(<DashboardPage />);

    await screen.findByText('Available');
    await user.click(screen.getByRole('button', { name: /view utilisation reports/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/admin/reports');
  });

  it('sets booking count to zero when there is no user id or token', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, id: '' },
      token: null,
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles rooms and booking api failures with per-call fallbacks', async () => {
    (apiRequest as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('rooms fail'))
      .mockRejectedValueOnce(new Error('bookings fail'));

    mockUseAuth.mockReturnValue({
      user: { ...mockUser, role: 'ADMIN' },
      token: 'fake-token',
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();
      expect(screen.getByText('Deactivated')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
    });
  });
});
