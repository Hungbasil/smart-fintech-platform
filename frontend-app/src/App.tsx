import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Wallets } from './pages/Wallets';
import { Analytics } from './pages/Analytics';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import auth from './services/auth';

const Nav: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <nav className="p-4 bg-gray-50 border-b">
      <ul className="flex gap-4">
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/transactions">Transactions</Link></li>
        <li><Link to="/wallets">Wallets</Link></li>
        <li><Link to="/analytics">Analytics</Link></li>
      </ul>
      <div className="float-right">
        {auth.isAuthenticated() ? (
          <button onClick={handleLogout} className="ml-4">Logout</button>
        ) : (
          <Link to="/login" className="ml-4">Login</Link>
        )}
      </div>
    </nav>
  );
};

function AppRouter() {
  return (
    <BrowserRouter>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default AppRouter;
