import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import IDSPage        from './pages/IDSPage';
import PhishingPage   from './pages/PhishingPage';
import RiskPage       from './pages/RiskPage';
import ActivityPage   from './pages/ActivityPage';
import SettingsPage   from './pages/SettingsPage';
import ProfilePage    from './pages/ProfilePage';
import AuthCallback   from './pages/AuthCallback';

// Protected route wrapper — redirects to /login if not authenticated
// Checks BOTH React context state AND localStorage so a timing race
// after OAuth redirect can never falsely bounce the user to /login.
function PrivateRoute({ children }) {
  const { token } = useAuth();
  const isAuthenticated = token || localStorage.getItem('smartsec_token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login"         element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ids"       element={<IDSPage />} />
        <Route path="/phishing"  element={<PhishingPage />} />
        <Route path="/risk"      element={<RiskPage />} />
        <Route path="/activity"  element={<ActivityPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
