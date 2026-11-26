from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Administrador


class IsAdminOrReadOnly(BasePermission):
    """
    Permite leitura pública (GET, HEAD, OPTIONS) para o catálogo (RF01, RF02, RF03, RF06)
    e exige autenticação de Administrador para escrita (POST, PUT, PATCH, DELETE - RF08).
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return isinstance(request.user, Administrador)


class IsAdminAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Administrador)