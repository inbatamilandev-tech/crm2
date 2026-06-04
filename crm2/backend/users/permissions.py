from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from functools import wraps

# ---------------------------------------------------------------------------
# Method → Permission action mapping
# ---------------------------------------------------------------------------
_METHOD_ACTION_MAP = {
    'GET':    'view',
    'HEAD':   'view',
    'OPTIONS':'view',
    'POST':   'create',
    'PUT':    'edit',
    'PATCH':  'edit',
    'DELETE': 'delete',
}


def _user_has_perm(user, perm_name):
    """
    Return True if the authenticated user has the named permission via their role,
    OR if they have 'admin.access' (superuser shortcut).
    Returns False for unauthenticated users or users with no role.
    """
    if not user or not user.is_authenticated:
        return False
    if not user.role:
        return False
    role_perms = user.role.permissions.values_list('name', flat=True)
    return perm_name in role_perms or 'admin.access' in role_perms


# ---------------------------------------------------------------------------
# HasModulePermission — the core RBAC class for all module ViewSets
# ---------------------------------------------------------------------------

class HasModulePermission(permissions.BasePermission):
    """
    Enforces permission checks based on HTTP method + module name.

    ViewSets must set:
        rbac_module = 'lead'   # e.g. 'lead', 'contact', 'deal', 'task', ...

    Permission names are resolved as:
        GET    → <module>.view
        POST   → <module>.create
        PUT    → <module>.edit
        PATCH  → <module>.edit
        DELETE → <module>.delete

    Admin users (those with 'admin.access') bypass all module checks.
    """

    rbac_module = None  # Subclasses / ViewSets must override this

    def _get_module(self, view):
        """Resolve module name from the view's rbac_module attribute."""
        return getattr(view, 'rbac_module', self.rbac_module)

    def has_permission(self, request, view):
        # Must be authenticated first
        if not request.user or not request.user.is_authenticated:
            return False

        # Safe methods (OPTIONS, HEAD) — allow if authenticated
        if request.method in permissions.SAFE_METHODS:
            module = self._get_module(view)
            if not module:
                return True  # No module set — fall back to IsAuthenticated behavior
            return _user_has_perm(request.user, f'{module}.view')

        module = self._get_module(view)
        if not module:
            # No module configured — treat as IsAuthenticated
            return bool(request.user and request.user.is_authenticated)

        action = _METHOD_ACTION_MAP.get(request.method, 'view')
        perm_name = f'{module}.{action}'
        return _user_has_perm(request.user, perm_name)

    def has_object_permission(self, request, view, obj):
        """
        Object-level permission: combines module permission + data scope.

        Data scope rules (from user.role.data_scope):
          'global' → access everything
          'team'   → access records where owner belongs to same team
          'own'    → access only own records

        The owner of an object is resolved via:
          1. obj.owner        (Contacts, Deals, Quotes, Invoices)
          2. obj.assigned_to  (Leads, Tasks)
          3. obj.user         (Calls)
          4. Falls back to full access for objects without owner fields
        """
        user = request.user

        # Re-check module permission at object level
        module = self._get_module(view)
        if module:
            action = _METHOD_ACTION_MAP.get(request.method, 'view')
            perm_name = f'{module}.{action}'
            if not _user_has_perm(user, perm_name):
                return False

        if not user.role:
            return False

        scope = user.role.data_scope

        # Global scope — full access
        if scope == 'global':
            return True

        # Resolve the record owner
        owner = _resolve_owner(obj)

        # No owner resolved — allow access (shared/catalog records)
        if owner is None:
            return True

        # Team scope
        if scope == 'team':
            if not user.team:
                return owner == user
            return bool(owner.team and owner.team == user.team)

        # Own scope
        if scope == 'own':
            return owner == user

        return False


def _resolve_owner(obj):
    """
    Resolve the authoritative owner of a record.
    Priority: .owner → .assigned_to → .user → None
    """
    if hasattr(obj, 'owner') and obj.owner is not None:
        return obj.owner
    if hasattr(obj, 'assigned_to') and obj.assigned_to is not None:
        return obj.assigned_to
    if hasattr(obj, 'user') and obj.user is not None:
        return obj.user
    return None


# ---------------------------------------------------------------------------
# Legacy: RoleBasedAccessPermission (kept for backward compatibility)
# Now delegates to HasModulePermission logic without a module restriction,
# so it acts as a pure data-scope filter (used when module perms are not
# separately required, e.g. by ViewSets that set their own module).
# ---------------------------------------------------------------------------

class RoleBasedAccessPermission(HasModulePermission):
    """
    Backward-compatible alias.  ViewSets that use this directly must also set
    `rbac_module` on the ViewSet, or this behaves as plain IsAuthenticated for
    has_permission and data-scope-only for has_object_permission.
    """
    pass


# ---------------------------------------------------------------------------
# Factory: has_perm() — for one-off action-level permission checks
# ---------------------------------------------------------------------------

def has_perm(perm_name):
    """
    Returns a DRF permission class that allows access only if the user has
    the named permission (or admin.access).

    Usage:
        permission_classes = [has_perm('invoice.generate')]
    """
    class _NamedPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            return _user_has_perm(request.user, perm_name)

    _NamedPermission.__name__ = f'HasPerm_{perm_name}'
    return _NamedPermission


# ---------------------------------------------------------------------------
# Decorator: permission_required() — for function-based views
# ---------------------------------------------------------------------------

def permission_required(perm_name):
    """
    Decorator for views that checks the user has a particular permission.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            request = args[1] if len(args) > 1 and hasattr(args[1], 'user') else args[0]

            if not hasattr(request, 'user') or not request.user.is_authenticated:
                raise PermissionDenied("Authentication credentials were not provided.")

            if not _user_has_perm(request.user, perm_name):
                raise PermissionDenied(
                    f"You do not have permission to perform this action. Required: {perm_name}"
                )

            return view_func(*args, **kwargs)
        return _wrapped_view
    return decorator


# ---------------------------------------------------------------------------
# Convenience permission classes
# ---------------------------------------------------------------------------

class IsAdmin(permissions.BasePermission):
    """Allows access only to users with global scope (admin)."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role
            and request.user.role.data_scope == 'global'
        )


class IsAdminOrManager(permissions.BasePermission):
    """Allows access to users with global or team scope."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role
            and request.user.role.data_scope in ('global', 'team')
        )


# ---------------------------------------------------------------------------
# Queryset scoping helper
# ---------------------------------------------------------------------------

def get_scoped_queryset(queryset, user, owner_field='owner'):
    """
    Filter a queryset based on the user's data scope.
    owner_field can be 'owner', 'assigned_to', 'user', or 'self' (for User model).
    """
    if not user.is_authenticated or not user.role:
        return queryset.none()

    scope = user.role.data_scope

    if scope == 'global':
        return queryset

    elif scope == 'team':
        if not user.team:
            # No team set — fall back to own records
            if owner_field == 'self':
                return queryset.filter(id=user.id)
            return queryset.filter(**{owner_field: user})

        if owner_field == 'self':
            return queryset.filter(team=user.team)
        elif owner_field == 'assigned_to':
            return queryset.filter(assigned_to__team=user.team)
        elif owner_field == 'user':
            return queryset.filter(user__team=user.team)
        else:
            return queryset.filter(owner__team=user.team)

    else:  # 'own'
        if owner_field == 'self':
            return queryset.filter(id=user.id)
        return queryset.filter(**{owner_field: user})
