import React from 'react';
import { usePermission } from '../../hooks/usePermission';

/**
 * Enterprise Permission Guard Component
 * 
 * Conditionally renders children based on user permissions.
 * Supports a single permission or an array of permissions.
 * 
 * @param {string|string[]} permission - The required permission(s)
 * @param {boolean} requireAll - If true and permission is an array, user must have ALL permissions
 * @param {React.ReactNode} fallback - UI to render if unauthorized
 */
export default function PermissionGuard({ 
  permission, 
  requireAll = false, 
  fallback = null, 
  children 
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let authorized = false;

  if (Array.isArray(permission)) {
    authorized = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
  } else {
    authorized = hasPermission(permission);
  }

  if (!authorized) {
    return fallback;
  }

  return <>{children}</>;
}
