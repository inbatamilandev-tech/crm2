from rest_framework import permissions
from functools import wraps
from rest_framework.exceptions import PermissionDenied

class RoleBasedAccessPermission(permissions.BasePermission):
    """
    Production-grade, owner-field-first RBAC permission.

    Resolution order for 'owner' of an object:
      1. obj.owner        — Contacts, Deals (primary ownership field)
      2. obj.assigned_to  — Leads, Tasks (assignment-based ownership)

    Rules:
      Global Scope → full access to everything
      Team Scope   → access to records where owner belongs to same team
      Own Scope    → access ONLY to records they personally own/are-assigned-to

    STRICT: if no owner can be resolved → access DENIED (no fallback leaks).
    """

    def has_permission(self, request, view):
        """Gate: user must be authenticated to reach any endpoint."""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user.role_fk:
            return False
            
        scope = user.role_fk.scope

        # Global scope have unrestricted access
        if scope == 'global':
            return True

        # ── Resolve the authoritative owner ──────────────────────────────
        owner = self._resolve_owner(obj)

        # STRICT: no owner resolved → deny. Never expose orphan records.
        if owner is None:
            return False

        # ── Team Scope: same-team access ─────────────────────────────────────
        if scope == 'team':
            if not user.team:
                return False
            return bool(owner.team and owner.team == user.team)

        # ── Own Scope: personal records only ──────────────────────────────────
        if scope == 'own':
            return owner == user

        return False

    # ── Internal helper ───────────────────────────────────────────────────
    @staticmethod
    def _resolve_owner(obj):
        """
        Return the User who owns this object, using the most direct field.
        Priority: .owner → .assigned_to → None (never a chain of relations).
        """
        # Direct ownership field (Contact, Deal)
        if hasattr(obj, 'owner') and obj.owner is not None:
            return obj.owner

        # Assignment-based field (Lead, Task)
        if hasattr(obj, 'assigned_to') and obj.assigned_to is not None:
            return obj.assigned_to

        return None

def has_perm(perm_name):
    class CustomPermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if not request.user.role_fk:
                return False
            return request.user.role_fk.permissions.filter(name=perm_name).exists()
    return CustomPermission

def permission_required(perm_name):
    """
    Decorator for views that checks that the user has a particular permission.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            # args[0] is typically 'self' for methods, or 'request' for function views
            request = args[1] if len(args) > 1 and hasattr(args[1], 'user') else args[0]
            
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                raise PermissionDenied("Authentication credentials were not provided.")
                
            if not request.user.role_fk or not request.user.role_fk.permissions.filter(name=perm_name).exists():
                raise PermissionDenied(f"You do not have permission to perform this action. Required: {perm_name}")
                
            return view_func(*args, **kwargs)
        return _wrapped_view
    return decorator

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role_fk and request.user.role_fk.scope == 'global')

class IsAdminOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role_fk and request.user.role_fk.scope in ['global', 'team'])

def get_scoped_queryset(queryset, user, owner_field='owner'):
    """
    Filter a queryset based on the user's scope.
    owner_field can be 'owner', 'assigned_to', or 'self' (for User model).
    """
    if not user.is_authenticated or not user.role_fk:
        return queryset.none()
        
    scope = user.role_fk.scope
    
    if scope == 'global':
        return queryset
        
    elif scope == 'team':
        if not user.team:
            return queryset.filter(**{owner_field: user}) if owner_field != 'self' else queryset.filter(id=user.id)
            
        if owner_field == 'self':
            return queryset.filter(team=user.team)
        elif owner_field == 'assigned_to':
            return queryset.filter(assigned_to__team=user.team)
        else:
            return queryset.filter(owner__team=user.team)
            
    else: # own
        if owner_field == 'self':
            return queryset.filter(id=user.id)
        elif owner_field == 'assigned_to':
            return queryset.filter(assigned_to=user)
        else:
            return queryset.filter(owner=user)
