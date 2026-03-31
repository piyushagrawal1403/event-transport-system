import { Navigate, useLocation } from 'react-router-dom';
import { getAuthSession, getHomeRouteForRole, type UserRole } from '../lib/auth';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: JSX.Element;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const session = getAuthSession();

  if (!session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(session.user.role)) {
    return <Navigate to={getHomeRouteForRole(session.user.role)} replace />;
  }

  return children;
}

