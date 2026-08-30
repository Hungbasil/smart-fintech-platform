import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLogin from '../pages/AdminLogin';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminDashboard } from '../pages/AdminDashboard';

export function AdminRouter() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />

      <Route
        path="/"
        element={
          <ProtectedRoute requireAdmin redirectTo="/admin/login">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default AdminRouter;
