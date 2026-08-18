import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import auth from '../services/auth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login({ email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      {error && <div className="text-red-600 mb-3">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Sign in</button>
        </div>
      </form>
    </div>
  );
};

export default Login;
