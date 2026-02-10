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
    { id: '1', name: 'Conference Room A', capacity: 10, location: 'Level 2' },
    { id: '2', name: 'Quiet Pod', capacity: 1, location: 'Level 3' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'fake-token' });
    // Default the API to return our mock rooms
    (apiRequest as any).mockResolvedValue(mockRooms);
  });

  it('should show a loading state initially and then render rooms', async () => {
    renderWithProviders(<RoomsPage />);

    expect(screen.getByText(/loading rooms/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Conference Room A')).toBeInTheDocument();
      expect(screen.getByText('Quiet Pod')).toBeInTheDocument();
    });

    expect(screen.getByText('2 Rooms Found')).toBeInTheDocument();
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

    await waitFor(() => {
      // 1. Use getAllByText if you expect multiple badges
      const badges = screen.getAllByText('Available Now');
      expect(badges.length).toBeGreaterThan(0);

      // 2. Or, better: check for specific details belonging to a specific room
      // We look for the text within the context of one specific room name
      expect(screen.getByText('10 Seats')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
    });
  });

  it('should show "No rooms found" if the API returns an empty list', async () => {
    (apiRequest as any).mockResolvedValue([]);

    renderWithProviders(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no rooms found/i)).toBeInTheDocument();
    });
  });

  it('should not fetch data if there is no auth token', async () => {
    mockUseAuth.mockReturnValue({ token: null });

    renderWithProviders(<RoomsPage />);

    await waitFor(() => {
      expect(apiRequest).not.toHaveBeenCalled();
      expect(screen.queryByText(/loading rooms/i)).not.toBeInTheDocument();
    });
  });
});