import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import { DashboardPage } from '../../../src/pages/DashboardPage.tsx';

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

  it('should render the welcome card with user display name and role', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText(`Welcome, ${mockUser.displayName}`)).toBeInTheDocument();
    expect(screen.getByText(mockUser.role)).toBeInTheDocument();
  });

  it('should fallback to email if displayName is missing', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, displayName: null },
      token: 'fake-token',
    });

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(`Welcome, ${mockUser.email}`)).toBeInTheDocument();
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
});