import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import RoomManagementPage from '../../../src/pages/RoomManagementPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const rooms = [
  { id: 'r1', name: 'Alpha', capacity: 8, location: 'L1', isActive: true, isAvailable: true, reason: null, createdAt: '', updatedAt: '', createdBy: 'admin' },
  { id: 'r2', name: 'Beta', capacity: 6, location: 'L2', isActive: true, isAvailable: false, reason: 'Projector issue', createdAt: '', updatedAt: '', createdBy: 'admin' },
  { id: 'r3', name: 'Gamma', capacity: 4, location: null, isActive: false, isAvailable: false, reason: null, createdAt: '', updatedAt: '', createdBy: 'admin' },
];

describe('RoomManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ token: 'jwt-token' });
    (apiRequest as any).mockResolvedValue(rooms);
  });

  it('renders rooms and supports status/search filtering', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);

    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /maintenance \(1\)/i }));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /all \(3\)/i }));
    await user.type(screen.getByPlaceholderText(/search by name or location/i), 'alpha');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('validates create/edit form and performs create', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(rooms)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([...rooms, { ...rooms[0], id: 'r4', name: 'Delta' }]);

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /create room/i }));
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(screen.getByText(/room name is required/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/conference room a/i), 'Delta');
    await user.type(screen.getByPlaceholderText(/e.g. 10/i), '10');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/rooms',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('validates maintenance reason and marks room under maintenance', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(rooms)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(rooms);

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');

    const alphaRow = screen.getByRole('row', { name: /alpha/i });
    await user.click(within(alphaRow).getByRole('button', { name: /^maintenance$/i }));
    await user.click(screen.getByRole('button', { name: /confirm maintenance/i }));
    expect(screen.getByText(/reason is required/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/scheduled av equipment upgrade/i), 'Aircon servicing');
    await user.click(screen.getByRole('button', { name: /confirm maintenance/i }));
    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/rooms/r1/status',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('handles restore/reactivate/deactivate actions including error', async () => {
    const user = userEvent.setup();
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/rooms') return Promise.resolve(rooms);
      if (endpoint === '/rooms/r2/status') return Promise.resolve({});
      if (endpoint === '/rooms/r3/status') return Promise.resolve({});
      if (endpoint === '/rooms/r1/status') return Promise.reject(new Error('cannot deactivate'));
      return Promise.resolve({});
    });

    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /restore/i }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/rooms/r2/status', expect.any(Object)));

    await user.click(screen.getByRole('button', { name: /reactivate/i }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/rooms/r3/status', expect.any(Object)));

    const alphaRow = screen.getByRole('row', { name: /alpha/i });
    await user.click(within(alphaRow).getByRole('button', { name: /^deactivate$/i }));
    expect(await screen.findByText(/cannot deactivate/i)).toBeInTheDocument();
  });

  it('supports edit mode update and validates capacity', async () => {
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/rooms') return Promise.resolve(rooms);
      if (endpoint === '/rooms/r1') return Promise.resolve({});
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    const alphaRow = await screen.findByRole('row', { name: /alpha/i });
    await user.click(within(alphaRow).getByRole('button', { name: /^edit$/i }));

    const capacityInput = screen.getByPlaceholderText(/e.g. 10/i);
    await user.clear(capacityInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/capacity must be a positive number/i)).toBeInTheDocument();

    await user.clear(capacityInput);
    await user.type(capacityInput, '12');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/rooms/r1', expect.any(Object)));
  });

  it('shows no-rooms state when backend returns empty list', async () => {
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/rooms') return Promise.resolve([]);
      return Promise.resolve({});
    });
    renderWithProviders(<RoomManagementPage />);
    expect(await screen.findByText(/no rooms found\. create one to get started/i)).toBeInTheDocument();
  });

  it('shows no-match message when filters exclude all rooms', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');
    await user.type(screen.getByPlaceholderText(/search by name or location/i), 'zzz');
    expect(screen.getByText(/no rooms match the current filters/i)).toBeInTheDocument();
  });

  it('shows fallback error when create/edit request fails with non-Error', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(rooms)
      .mockRejectedValueOnce('post failed');

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /create room/i }));
    await user.type(screen.getByPlaceholderText(/conference room a/i), 'Delta');
    await user.type(screen.getByPlaceholderText(/e.g. 10/i), '8');
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText(/operation failed/i)).toBeInTheDocument();
  });

  it('shows fallback error when maintenance request fails with non-Error', async () => {
    (apiRequest as any)
      .mockResolvedValueOnce(rooms)
      .mockRejectedValueOnce('maintenance failed');

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    const alphaRow = await screen.findByRole('row', { name: /alpha/i });
    await user.click(within(alphaRow).getByRole('button', { name: /^maintenance$/i }));
    await user.type(screen.getByPlaceholderText(/scheduled av equipment upgrade/i), 'Aircon servicing');
    await user.click(screen.getByRole('button', { name: /confirm maintenance/i }));
    expect(await screen.findByText(/failed to update status/i)).toBeInTheDocument();
  });

  it('shows fallback messages when status actions fail with non-Error values', async () => {
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/rooms') return Promise.resolve(rooms);
      if (endpoint === '/rooms/r2/status') return Promise.reject('restore fail');
      if (endpoint === '/rooms/r3/status') return Promise.reject('reactivate fail');
      if (endpoint === '/rooms/r1/status') return Promise.reject('deactivate fail');
      return Promise.resolve({});
    });

    const user = userEvent.setup();
    renderWithProviders(<RoomManagementPage />);
    await screen.findByText('Alpha');

    await user.click(screen.getByRole('button', { name: /restore/i }));
    expect(await screen.findByText(/failed to update status/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reactivate/i }));
    expect(await screen.findByText(/failed to reactivate room/i)).toBeInTheDocument();

    const alphaRow = screen.getByRole('row', { name: /alpha/i });
    await user.click(within(alphaRow).getByRole('button', { name: /^deactivate$/i }));
    expect(await screen.findByText(/failed to deactivate room/i)).toBeInTheDocument();
  });
});
