from rest_framework import permissions

class IsAdminOrMerchant(permissions.BasePermission):
    """
    Permission pour les Administrateurs et les Commerçants gérants.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['ADMIN_PME', 'COMMERCANT'])

class IsAgent(permissions.BasePermission):
    """
    Permission pour un Caissier.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'AGENT_CAISSIER')
