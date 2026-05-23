import { useAuth } from '../context/AuthContext';

export function usePermission() {
  const { user } = useAuth();

  const getPermissions = () => {
    return user?.permissions || [];
  };

  const hasPermission = (permission) => {
    // If permission string is empty, allow access
    if (!permission) return true;
    
    const permissions = getPermissions();
    return permissions.includes(permission) || permissions.includes('admin.access');
  };

  const hasAnyPermission = (permissions) => {
    if (!permissions || permissions.length === 0) return true;
    
    const userPermissions = getPermissions();
    if (userPermissions.includes('admin.access')) return true;
    
    return permissions.some(perm => userPermissions.includes(perm));
  };

  const hasAllPermissions = (permissions) => {
    if (!permissions || permissions.length === 0) return true;
    
    const userPermissions = getPermissions();
    if (userPermissions.includes('admin.access')) return true;
    
    return permissions.every(perm => userPermissions.includes(perm));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
