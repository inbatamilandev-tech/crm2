import { useAuth } from '../context/AuthContext';

/**
 * usePermission — Central RBAC hook for the CRM frontend.
 *
 * Reads the user's permissions array (populated by UserSerializer on login)
 * and exposes helpers for all permission checks across the app.
 *
 * Permission names follow the pattern:  <module>.<action>
 * Examples: lead.view, lead.create, deal.edit, invoice.delete
 *
 * Admin shortcut: any user with 'admin.access' passes ALL checks.
 */
export function usePermission() {
  const { user } = useAuth();

  /** Returns the raw permissions array for the current user. */
  const getPermissions = () => user?.permissions || [];

  /** Returns true if the user has the 'admin.access' permission. */
  const isAdmin = () => getPermissions().includes('admin.access');

  /**
   * hasPermission(permission)
   * Returns true if the user has the specific named permission.
   * Empty / null permission string → always allowed (open route).
   */
  const hasPermission = (permission) => {
    if (!permission) return true;
    const perms = getPermissions();
    return perms.includes(permission) || perms.includes('admin.access');
  };

  /**
   * hasAnyPermission(permissions[])
   * Returns true if the user has AT LEAST ONE of the listed permissions.
   */
  const hasAnyPermission = (permissions) => {
    if (!permissions || permissions.length === 0) return true;
    const perms = getPermissions();
    if (perms.includes('admin.access')) return true;
    return permissions.some((p) => perms.includes(p));
  };

  /**
   * hasAllPermissions(permissions[])
   * Returns true if the user has ALL of the listed permissions.
   */
  const hasAllPermissions = (permissions) => {
    if (!permissions || permissions.length === 0) return true;
    const perms = getPermissions();
    if (perms.includes('admin.access')) return true;
    return permissions.every((p) => perms.includes(p));
  };

  /**
   * canDo(module, action)
   * Shorthand for checking a module-action pair.
   * Equivalent to hasPermission(`${module}.${action}`)
   *
   * @param {string} module  e.g. 'lead', 'deal', 'invoice'
   * @param {string} action  e.g. 'view', 'create', 'edit', 'delete'
   *
   * Examples:
   *   canDo('lead', 'view')     → checks 'lead.view'
   *   canDo('invoice', 'delete') → checks 'invoice.delete'
   */
  const canDo = (module, action) => hasPermission(`${module}.${action}`);

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canDo,
    isAdmin,
  };
}
