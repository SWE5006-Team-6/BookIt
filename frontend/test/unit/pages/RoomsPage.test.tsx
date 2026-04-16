import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import RoomsPage from '../../../src/pages/RoomsPage.tsx';
import { apiRequest } from '../../../src/lib/api';

// Mock the API request helper
vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('RoomsPage', () => {
  const mockRooms = [
    { id: '1', name: 'Conference Room A', capacity: 10, location: 'Level 2', isActive: true, isAvailable: true, reason: null },
    { id: '2', name: 'Quiet Pod', capacity: 1, location: 'Level 3', isActive: true, isAvailable: true, reason: null },
  ];
  const mockPolicies = [
    {
      id: 'p1',
      key: 'min_duration_minutes',
      value: '30',
      label: 'Minimum Booking Duration (minutes)',
      description: 'The shortest allowed booking duration.',
      isActive: true,
      updatedBy: 'admin',
      updatedAt: '2099-01-01T00:00:00Z',
    },
    {
      id: 'p2',
      key: 'max_active_bookings_per_user',
      value: '5',
      label: 'Maximum Active Bookings Per User',
      description: 'The maximum number of active bookings.',
      isActive: true,
      updatedBy: 'admin',
      updatedAt: '2099-01-01T00:00:00Z',
    },
    {
      id: 'p3',
      key: 'max_duration_minutes',
      value: '120',
      label: 'Maximum Booking Duration (minutes)',
      description: 'The longest allowed booking duration.',
      isActive: false,
      updatedBy: 'admin',
      updatedAt: '2099-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'fake-token', user: { role: 'USER' } });
    // Default the API to return our mock rooms
    (apiRequest as any).mockResolvedValue(mockRooms);
  });

  it('should show a loading state initially and then render rooms', async () => {
    renderWithProviders(<RoomsPage />);

    expect(apiRequest).toHaveBeenCalledWith('/rooms', expect.any(Object));

    await waitFor(
      () => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
        expect(screen.getByText('Quiet Pod')).toBeInTheDocument();
        expect(screen.getByText('2 Rooms Found')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should filter rooms based on search input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Conference Room A')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/search rooms/i);
    await user.type(searchInput, 'Conference');

    // "Conference Room A" should stay, "Quiet Pod" should disappear
    expect(screen.getByText('Conference Room A')).toBeInTheDocument();
    expect(screen.queryByText('Quiet Pod')).not.toBeInTheDocument();
  });

  it('should display room details correctly in the RoomCard', async () => {
    renderWithProviders(<RoomsPage />);

    await waitFor(
      () => {
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
        expect(screen.getByText('10 Seats')).toBeInTheDocument();
        expect(screen.getByText('Level 2')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show "No rooms found" if the API returns an empty list', async () => {
    (apiRequest as any).mockResolvedValue([]);

    renderWithProviders(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no rooms found/i)).toBeInTheDocument();
    });
  });

  it('should fetch rooms even when there is no auth token (public list)', async () => {
    mockUseAuth.mockReturnValue({ token: null, user: null });
    (apiRequest as any).mockResolvedValue(mockRooms);

    renderWithProviders(<RoomsPage />);

    await waitFor(
      () => {
        expect(apiRequest).toHaveBeenCalledWith('/rooms', expect.objectContaining({ token: undefined }));
        expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('shows booking policies in a dialog with user-friendly wording', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(mockRooms)
      .mockResolvedValueOnce(mockPolicies);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /booking policies/i }));

    expect(await screen.findByText(/minimum booking duration: 30 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/up to 5 active bookings at one time/i)).toBeInTheDocument();
    expect(screen.queryByText(/maximum booking duration/i)).not.toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(
      '/booking-policies',
      expect.objectContaining({ token: 'fake-token' }),
    );
  });

  it('shows a loading state before booking policies resolve', async () => {
    let resolvePolicies!: (value: typeof mockPolicies) => void;
    const pendingPolicies = new Promise<typeof mockPolicies>((resolve) => {
      resolvePolicies = resolve;
    });
    (apiRequest as any)
      .mockResolvedValueOnce(mockRooms)
      .mockReturnValueOnce(pendingPolicies);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /booking policies/i }));

    expect(screen.getByText(/loading booking policies/i)).toBeInTheDocument();

    resolvePolicies(mockPolicies);
    expect(await screen.findByText(/minimum booking duration: 30 minutes/i)).toBeInTheDocument();
  });

  it('shows an empty-state message when no user-facing policies are available', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(mockRooms)
      .mockResolvedValueOnce([
        {
          id: 'p4',
          key: 'max_duration_minutes',
          value: '120',
          label: 'Maximum Booking Duration (minutes)',
          description: 'The longest allowed booking duration.',
          isActive: false,
          updatedBy: 'admin',
          updatedAt: '2099-01-01T00:00:00Z',
        },
      ]);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /booking policies/i }));

    expect(await screen.findByText(/no active booking policies to show/i)).toBeInTheDocument();
  });

  it('shows retry state when booking policies fail to load', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (apiRequest as any)
      .mockResolvedValueOnce(mockRooms)
      .mockRejectedValueOnce(new Error('policy load fail'))
      .mockResolvedValueOnce(mockPolicies);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /booking policies/i }));
    expect(await screen.findByText(/failed to load booking policies/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/minimum booking duration: 30 minutes/i)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('shows sign-in guidance instead of fetching booking policies for public users', async () => {
    mockUseAuth.mockReturnValue({ token: null, user: null });
    (apiRequest as any).mockResolvedValueOnce(mockRooms);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /booking policies/i }));

    expect(await screen.findByText(/sign in to view the current booking policies/i)).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('should render admin manage button when user is admin', async () => {
    mockUseAuth.mockReturnValue({ token: 'fake-token', user: { role: 'ADMIN' } });
    renderWithProviders(<RoomsPage />);

    const manageLink = await screen.findByRole('link', { name: /manage rooms/i });
    expect(manageLink).toHaveAttribute('href', '/admin/rooms');
  });

  it('should apply capacity filter and fallback location label', async () => {
    (apiRequest as any).mockResolvedValue([
      { id: '1', name: 'Small Room', capacity: 2, location: null, isActive: true, isAvailable: true, reason: null },
      { id: '2', name: 'Large Room', capacity: 8, location: 'Level 4', isActive: true, isAvailable: true, reason: null },
    ]);

    const user = userEvent.setup();
    renderWithProviders(<RoomsPage />);

    await screen.findByText('Small Room');
    expect(screen.getByText('—')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/min capacity/i), '5');

    expect(screen.queryByText('Small Room')).not.toBeInTheDocument();
    expect(screen.getByText('Large Room')).toBeInTheDocument();
  });

  it('should show maintenance badge/details and disable inactive rooms', async () => {
    (apiRequest as any).mockResolvedValue([
      { id: '1', name: 'Maintenance Room', capacity: 6, location: 'Level 1', isActive: true, isAvailable: false, reason: 'AC issue' },
      { id: '2', name: 'Inactive Room', capacity: 6, location: 'Level 1', isActive: false, isAvailable: true, reason: null },
    ]);

    renderWithProviders(<RoomsPage />);

    expect(await screen.findByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('AC issue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(screen.queryByText('Inactive Room')).not.toBeInTheDocument();
  });

  it('should call scrollTo when return to top button is clicked', async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    renderWithProviders(<RoomsPage />);
    await screen.findByText('Conference Room A');
    await user.click(screen.getByRole('button', { name: /return to top/i }));

    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    scrollSpy.mockRestore();
  });

  it('should stop loading and show no rooms when api fails', async () => {
    (apiRequest as any).mockRejectedValue(new Error('network down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderWithProviders(<RoomsPage />);

    expect(await screen.findByText(/no rooms found/i)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
