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
