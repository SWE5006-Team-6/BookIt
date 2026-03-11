import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/render.tsx';
import UserManagementPage from '../../../src/pages/UserManagementPage.tsx';
import { apiRequest } from '../../../src/lib/api';

vi.mock('../../../src/lib/api', () => ({
  apiRequest: vi.fn(),
}));

const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const users = [
  {
    id: 'u-admin',
    email: 'admin@example.com',
    displayName: 'Admin',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: 'u-user',
    email: 'user@example.com',
    displayName: 'Normal',
    role: 'USER',
    isActive: true,
    createdAt: '2026-03-02T10:00:00.000Z',
  },
];

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      token: 'jwt-token',
      user: { id: 'u-admin', email: 'admin@example.com', role: 'ADMIN' },
    });
    (apiRequest as any).mockResolvedValue(users);
  });

  it('renders users and supports searching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/search by email, name, or role/i), 'admin@');
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('Normal')).not.toBeInTheDocument();
  });

  it('shows empty-state message when search has no matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserManagementPage />);

    await screen.findByText('User Management');
    await user.type(screen.getByPlaceholderText(/search by email, name, or role/i), 'nope');
    expect(screen.getByText(/no users match the current search/i)).toBeInTheDocument();
  });

  it('shows load error and empty state when initial load fails', async () => {
    (apiRequest as any).mockRejectedValueOnce(new Error('Load failed'));
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText(/load failed/i)).toBeInTheDocument();
    expect(screen.getByText(/no users match the current search/i)).toBeInTheDocument();
  });

  it('uses fallback error message when load fails with non-Error', async () => {
    (apiRequest as any).mockRejectedValueOnce('boom');
    renderWithProviders(<UserManagementPage />);

    expect(await screen.findByText(/failed to load users/i)).toBeInTheDocument();
  });

  it('supports sorting by clicking column headers (toggle + different keys)', async () => {
    const user = userEvent.setup();
    const sortableUsers = [
      { id: 'u1', email: 'b@example.com', displayName: 'Beta', role: 'USER', isActive: true, createdAt: '2026-03-03T00:00:00.000Z' },
      { id: 'u2', email: 'a@example.com', displayName: 'Alpha', role: 'ADMIN', isActive: false, createdAt: '2026-03-01T00:00:00.000Z' },
      { id: 'u3', email: 'c@example.com', displayName: null, role: 'USER', isActive: true, createdAt: '2026-03-02T00:00:00.000Z' },
    ];
    (apiRequest as any).mockResolvedValueOnce(sortableUsers);

    renderWithProviders(<UserManagementPage />);
    await screen.findByText('User Management');

    // columnheader order: User | Role | Active | Created | Actions
    const [userHeader, roleHeader, activeHeader, createdHeader] = screen.getAllByRole('columnheader');

    // Sort by User (displayName/email) asc
    await user.click(userHeader);
    const rows1 = screen.getAllByRole('row').slice(1);
    expect(within(rows1[0]).getByText(/alpha/i)).toBeInTheDocument();

    // Toggle same key to desc
    await user.click(userHeader);
    const rows2 = screen.getAllByRole('row').slice(1);
    expect(within(rows2[0]).getAllByText('c@example.com')[0]).toBeInTheDocument();

    // Sort by Role asc — ADMIN comes before USER lexicographically
    await user.click(roleHeader);
    const rows3 = screen.getAllByRole('row').slice(1);
    expect(within(rows3[0]).getByText(/alpha/i)).toBeInTheDocument();

    // Sort by Active asc — inactive (0) sorts before active (1)
    await user.click(activeHeader);
    const rows4 = screen.getAllByRole('row').slice(1);
    expect(within(rows4[0]).getByText(/alpha/i)).toBeInTheDocument();

    // Sort by Created asc — oldest first
    await user.click(createdHeader);
    const rows5 = screen.getAllByRole('row').slice(1);
    expect(within(rows5[0]).getByText(/alpha/i)).toBeInTheDocument();
  });

  it('handles equal sort values (comparator returns 0)', async () => {
    const user = userEvent.setup();
    const equalRoleUsers = [
      { id: 'u1', email: 'a@example.com', displayName: 'A', role: 'USER', isActive: true, createdAt: '2026-03-01T00:00:00.000Z' },
      { id: 'u2', email: 'b@example.com', displayName: 'B', role: 'USER', isActive: true, createdAt: '2026-03-02T00:00:00.000Z' },
    ];
    (apiRequest as any).mockResolvedValueOnce(equalRoleUsers);

    renderWithProviders(<UserManagementPage />);
    await screen.findByText('User Management');

    const [, roleHeader] = screen.getAllByRole('columnheader');
    await user.click(roleHeader);

    // Both users have the same role — both should still be visible
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('updates role via PATCH when select changes', async () => {
    const user = userEvent.setup();
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/users') return Promise.resolve(users);
      if (endpoint === '/users/u-user') {
        return Promise.resolve({ ...users[1], role: 'ADMIN' });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<UserManagementPage />);
    const row = await screen.findByRole('row', { name: /normal/i });
    const select = within(row).getByRole('combobox');

    await user.selectOptions(select, 'ADMIN');

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/users/u-user',
        expect.objectContaining({ method: 'PATCH', body: { role: 'ADMIN' } }),
      );
    });
  });

  it('toggles active via PATCH when switch changes', async () => {
    const user = userEvent.setup();
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/users') return Promise.resolve(users);
      if (endpoint === '/users/u-user') {
        return Promise.resolve({ ...users[1], isActive: false });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<UserManagementPage />);
    const row = await screen.findByRole('row', { name: /normal/i });
    const checkbox = within(row).getByRole('checkbox');

    await user.click(checkbox);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/users/u-user',
        expect.objectContaining({ method: 'PATCH', body: { isActive: false } }),
      );
    });
  });

  it('disables self role/active controls', async () => {
    renderWithProviders(<UserManagementPage />);
    const row = await screen.findByRole('row', { name: /admin/i });

    expect(within(row).getByRole('combobox')).toBeDisabled();
    expect(within(row).getByRole('checkbox')).toBeDisabled();
  });

  it('shows error message when backend rejects update', async () => {
    const user = userEvent.setup();
    (apiRequest as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/users') return Promise.resolve(users);
      if (endpoint === '/users/u-user') return Promise.reject(new Error('Forbidden'));
      return Promise.resolve({});
    });

    renderWithProviders(<UserManagementPage />);
    const row = await screen.findByRole('row', { name: /normal/i });
    await user.selectOptions(within(row).getByRole('combobox'), 'ADMIN');

    expect(await screen.findByText(/forbidden/i)).toBeInTheDocument();
  });

  it('does not call PATCH when token is missing', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      token: null,
      user: { id: 'u-admin', email: 'admin@example.com', role: 'ADMIN' },
    });
    (apiRequest as any).mockResolvedValueOnce(users);

    renderWithProviders(<UserManagementPage />);
    const row = await screen.findByRole('row', { name: /normal/i });
    await user.selectOptions(within(row).getByRole('combobox'), 'ADMIN');

    // Should have only the initial load call
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/users', expect.any(Object));
  });
  it('non-array API response falls back to empty array', async () => {
  (apiRequest as any).mockResolvedValueOnce(null);
  renderWithProviders(<UserManagementPage />);
  await screen.findByText('User Management');
  expect(screen.getByText(/no users match/i)).toBeInTheDocument();
});

it('toggles sort direction from desc back to asc on third click', async () => {
  const user = userEvent.setup();
  renderWithProviders(<UserManagementPage />);
  await screen.findByText('User Management');

  const [userHeader] = screen.getAllByRole('columnheader');
  await user.click(userHeader); // asc
  await user.click(userHeader); // desc
  await user.click(userHeader); // back to asc
  const rows = screen.getAllByRole('row').slice(1);
  // admin sorts before normal alphabetically
  expect(within(rows[0]).getByText('Admin')).toBeInTheDocument();
});

it('sorts by displayName using email fallback for null displayName', async () => {
  const user = userEvent.setup();
  const mixed = [
    { id: 'u1', email: 'z@example.com', displayName: null, role: 'USER', isActive: true, createdAt: '2026-03-01T00:00:00.000Z' },
    { id: 'u2', email: 'a@example.com', displayName: 'Aaron', role: 'USER', isActive: true, createdAt: '2026-03-02T00:00:00.000Z' },
  ];
  (apiRequest as any).mockResolvedValueOnce(mixed);
  renderWithProviders(<UserManagementPage />);
  await screen.findByText('User Management');

  const [userHeader] = screen.getAllByRole('columnheader');
  await user.click(userHeader); // asc: Aaron < z@example.com
  const rows = screen.getAllByRole('row').slice(1);
  expect(within(rows[0]).getByText('Aaron')).toBeInTheDocument();
});

it('sorts by isActive correctly (valB branch covered)', async () => {
  const user = userEvent.setup();
  const mixed = [
    { id: 'u1', email: 'a@example.com', displayName: 'A', role: 'USER', isActive: true, createdAt: '2026-03-01T00:00:00.000Z' },
    { id: 'u2', email: 'b@example.com', displayName: 'B', role: 'USER', isActive: false, createdAt: '2026-03-02T00:00:00.000Z' },
  ];
  (apiRequest as any).mockResolvedValueOnce(mixed);
  renderWithProviders(<UserManagementPage />);
  await screen.findByText('User Management');

  const [,, activeHeader] = screen.getAllByRole('columnheader');
  await user.click(activeHeader); // asc: inactive first
  const rows = screen.getAllByRole('row').slice(1);
  expect(within(rows[0]).getByText('B')).toBeInTheDocument();
});

it('shows fallback error text for non-Error PATCH failures', async () => {
  const user = userEvent.setup();
  (apiRequest as any).mockImplementation((endpoint: string) => {
    if (endpoint === '/users') return Promise.resolve(users);
    if (endpoint === '/users/u-user') return Promise.reject('unknown error');
    return Promise.resolve({});
  });

  renderWithProviders(<UserManagementPage />);
  const row = await screen.findByRole('row', { name: /normal/i });
  await user.selectOptions(within(row).getByRole('combobox'), 'ADMIN');

  expect(await screen.findByText(/failed to update user/i)).toBeInTheDocument();
});
it('sorts by isActive correctly (valB inactive branch covered)', async () => {
  const user = userEvent.setup();
  const mixed = [
    { id: 'u1', email: 'a@example.com', displayName: 'A', role: 'USER', isActive: false, createdAt: '2026-03-01T00:00:00.000Z' },
    { id: 'u2', email: 'b@example.com', displayName: 'B', role: 'USER', isActive: true, createdAt: '2026-03-02T00:00:00.000Z' },
    { id: 'u3', email: 'c@example.com', displayName: 'C', role: 'USER', isActive: false, createdAt: '2026-03-03T00:00:00.000Z' },
  ];
  (apiRequest as any).mockResolvedValueOnce(mixed);
  renderWithProviders(<UserManagementPage />);
  await screen.findByText('User Management');

  const [,, activeHeader] = screen.getAllByRole('columnheader');
  await user.click(activeHeader); // asc: inactive (0) first, then active (1)
  const rows = screen.getAllByRole('row').slice(1);
  // A and C are inactive, B is active — B should be last
  expect(within(rows[2]).getByText('B')).toBeInTheDocument();
});
});
