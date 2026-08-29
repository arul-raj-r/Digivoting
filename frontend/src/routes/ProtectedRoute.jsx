import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

// Guard for authenticated general users (e.g. Voters)
export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader message="Verifying authentication session..." fullPage />;
  }

  if (!isAuthenticated) {
    // Save current location to redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

// Guard for admin dashboard
export function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader message="Verifying administrative access..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/403" replace />;
  }

  return children;
}

// Guard for voting - check if voter profile is eligible
export function VerificationRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Loader message="Verifying voting eligibility..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is a voter but not eligible (e.g. status from backend is not verified)
  // We can let the component show the explanation or do route-level blockage
  // Standard is to let the component handle it or redirect to /voter-verification
  return children;
}
