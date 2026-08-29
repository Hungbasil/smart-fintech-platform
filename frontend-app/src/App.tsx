import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Wallets } from './pages/Wallets';
import { Analytics } from './pages/Analytics';
import { Categories } from './pages/Categories';
import { Budgets } from './pages/Budgets';
import { Recurring } from './pages/Recurring';
import { SavingGoals } from './pages/SavingGoals';
import { Debts } from './pages/Debts';
import { PredictiveAnalytics } from './pages/PredictiveAnalytics';
import Login from './pages/Login';
import Register from './pages/Register';
import { Navigate } from 'react-router-dom';
import { Investments } from './pages/Investments';
import { AdminDashboard } from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import OAuth2Redirect from './pages/OAuth2Redirect';
import DebtCalendar from './pages/DebtCalendar';

function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
          <Route path="/wallets" element={<ProtectedRoute><Wallets /></ProtectedRoute>} />
          <Route path="/analytics" element={<Navigate to="/analytics/overview" replace />} />
          <Route path="/analytics/overview" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/analytics/predictive" element={<ProtectedRoute><PredictiveAnalytics /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
          <Route path="/recurring" element={<ProtectedRoute><Recurring /></ProtectedRoute>} />
          <Route path="/saving-goals" element={<ProtectedRoute><SavingGoals /></ProtectedRoute>} />
          <Route path="/debts" element={<ProtectedRoute><Debts /></ProtectedRoute>} />
          <Route path="/debts/calendar" element={<ProtectedRoute><DebtCalendar /></ProtectedRoute>} />
          <Route path="/investments" element={<ProtectedRoute><Investments /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth2/redirect" element={<OAuth2Redirect />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default AppRouter;
