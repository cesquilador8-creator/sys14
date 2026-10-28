import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Verifying your session…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || !profile.can_access_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-red-600">Access denied</h1>
          <p className="text-sm text-slate-600">
            Your account does not have admin dashboard access. Please contact an administrator for permission.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
