import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ 
  children, 
  permission = null, 
  requireAll = false 
}) {
  const { user, loading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission) {
    let authorized = false;
    if (Array.isArray(permission)) {
      authorized = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
    } else {
      authorized = hasPermission(permission);
    }

    if (!authorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
