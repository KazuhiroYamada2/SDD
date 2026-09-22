import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderAuthenticated } from '../test/render-authenticated';
import { UsersManagement } from './UsersManagement';

const self = { id: 'test-user-id', email: 'admin@example.test', role: 'admin', active: true } as const;
const other = { id: 'other-user-id', email: 'staff@example.test', role: 'staff', active: false } as const;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

describe('UsersManagement', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows loading, active/inactive users, and disables self role controls', async () => {
    let resolveFetch!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; })));
    renderAuthenticated(<UsersManagement onBack={vi.fn()} />, {
      accessToken: 'token', user: { id: self.id, email: self.email, role: 'admin' },
    });
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中');
    resolveFetch(response([self, other]));
    expect(await screen.findByRole('cell', { name: self.email })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'active' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'inactive' })).toBeInTheDocument();
    expect(screen.getByLabelText(`${self.email}のrole`)).toBeDisabled();
    expect(screen.getByRole('button', { name: `roleを変更: ${self.email}` })).toBeDisabled();
  });

  it('changes another user role and refetches the list', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([self, other]))
      .mockResolvedValueOnce(response({ ...other, role: 'manager' }))
      .mockResolvedValueOnce(response([self, { ...other, role: 'manager' }]));
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<UsersManagement onBack={vi.fn()} />, {
      accessToken: 'token', user: { id: self.id, email: self.email, role: 'admin' },
    });
    const select = await screen.findByLabelText(`${other.email}のrole`);
    fireEvent.change(select, { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: `roleを変更: ${other.email}` }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1]![0]).toBe(`/api/v1/users/${other.id}/role`);
    expect(fetchMock.mock.calls[2]![0]).toBe('/api/v1/users');
    expect(await screen.findByLabelText(`${other.email}のrole`)).toHaveValue('manager');
  });

  it('shows a 409 message without clearing Authentication', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([self, other]))
      .mockResolvedValueOnce(response({ message: 'At least one active admin must remain.' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<UsersManagement onBack={vi.fn()} />, {
      accessToken: 'token', user: { id: self.id, email: self.email, role: 'admin' },
    });
    const select = await screen.findByLabelText(`${other.email}のrole`);
    fireEvent.change(select, { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: `roleを変更: ${other.email}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('At least one active admin must remain.');
    expect(screen.getByRole('heading', { name: 'ユーザー管理' })).toBeInTheDocument();
  });

  it('shows a 403 message without clearing Authentication', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response([self, other]))
      .mockResolvedValueOnce(response({ code: 'FORBIDDEN', message: 'Forbidden.' }, 403));
    vi.stubGlobal('fetch', fetchMock);
    renderAuthenticated(<UsersManagement onBack={vi.fn()} />, {
      accessToken: 'token', user: { id: self.id, email: self.email, role: 'admin' },
    });
    const select = await screen.findByLabelText(`${other.email}のrole`);
    fireEvent.change(select, { target: { value: 'manager' } });
    fireEvent.click(screen.getByRole('button', { name: `roleを変更: ${other.email}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden.');
    expect(screen.getByRole('heading', { name: 'ユーザー管理' })).toBeInTheDocument();
  });
});
