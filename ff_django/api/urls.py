from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    PerfilAdminView,
    CategoriaViewSet,
    MarcaViewSet,
    ProdutoViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r'produtos', ProdutoViewSet, basename='produto')
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'marcas', MarcaViewSet, basename='marca')

urlpatterns = [
    path('auth/login', LoginView.as_view(), name='auth-login'),
    path('auth/me', PerfilAdminView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]