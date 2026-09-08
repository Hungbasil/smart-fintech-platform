import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const protectedContent = <div>Protected content</div>;

function renderRoute(requireAdmin = false) {
  return render(
    <MemoryRouter>
      <ProtectedRoute requireAdmin={requireAdmin}>{protectedContent}</ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated users to login', () => {
    renderRoute();

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('blocks regular users from admin routes', () => {
    localStorage.setItem('authToken', 'user-token');
    localStorage.setItem('authUser', JSON.stringify({ id: '1', fullName: 'User', email: 'user@example.com', role: 'USER' }));

    renderRoute(true);

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('allows admin users through admin routes', () => {
    localStorage.setItem('authToken', 'admin-token');
    localStorage.setItem('authUser', JSON.stringify({ id: '1', fullName: 'Admin', email: 'admin@example.com', role: 'ADMIN' }));

    renderRoute(true);

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });
});
