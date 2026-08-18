import React from 'react';
import { Link } from 'react-router-dom';
import auth from '../services/auth';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  if (!auth.isAuthenticated()) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-white border-r p-4">
        <h2 className="text-xl font-bold mb-6">SmartFin</h2>
        <nav className="flex flex-col gap-3">
          <Link to="/" className="text-sm text-gray-700">Dashboard</Link>
          <Link to="/transactions" className="text-sm text-gray-700">Transactions</Link>
          <Link to="/wallets" className="text-sm text-gray-700">Wallets</Link>
          <Link to="/analytics" className="text-sm text-gray-700">Analytics</Link>
        </nav>
        <div className="mt-6">
          {auth.isAuthenticated() ? (
            <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="text-sm text-red-600">Logout</button>
          ) : (
            <Link to="/login" className="text-sm text-blue-600">Login</Link>
          )}
        </div>
      </aside>

      <div className="flex-1">
        <header className="p-4 border-b bg-white">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-lg font-semibold">Finance Dashboard</h1>
          </div>
        </header>
        <main className="p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
