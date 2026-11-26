from django.shortcuts import render

# Create your views here.
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Administrador, Categoria, Marca, Produto, ImagemProduto
from .serializers import (
    LoginSerializer,
    AdministradorSerializer,
    CategoriaSerializer,
    MarcaSerializer,
    ProdutoSerializer,
    ImagemProdutoSerializer,
)
from .authentication import gerar_token_admin
from .permissions import IsAdminOrReadOnly, IsAdminAuthenticated


class LoginView(APIView):
    """
    UC07 / RF07 - Acessar Painel Administrativo (Login)
    Endpoint: POST /api/auth/login
    """
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        senha = serializer.validated_data['senha']

        try:
            admin = Administrador.objects.get(email=email)
        except Administrador.DoesNotExist:
            return Response(
                {'erro': 'E-mail ou senha inválidos'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not admin.check_senha(senha):
            return Response(
                {'erro': 'E-mail ou senha inválidos'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        token = gerar_token_admin(admin)
        return Response({
            'token': token,
            'administrador': {
                'id_admin': admin.id_admin,
                'nome': admin.nome,
                'email': admin.email,
            }
        }, status=status.HTTP_200_OK)


class PerfilAdminView(APIView):
    """Verifica sessão do administrador autenticado."""
    permission_classes = [IsAdminAuthenticated]

    def get(self, request):
        return Response(AdministradorSerializer(request.user).data)


class CategoriaViewSet(viewsets.ModelViewSet):
    """Listagem pública de categorias para filtro (RF02/RF06) e CRUD administrativo."""
    queryset = Categoria.objects.all().order_by('nome')
    serializer_class = CategoriaSerializer
    permission_classes = [IsAdminOrReadOnly]


class MarcaViewSet(viewsets.ModelViewSet):
    """Listagem pública de marcas para filtro (RF02/RF06) e CRUD administrativo."""
    queryset = Marca.objects.all().order_by('nome')
    serializer_class = MarcaSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProdutoViewSet(viewsets.ModelViewSet):
    """
    RF01, RF02, RF03, RF06 (Público) e RF08 (CRUD Administrativo)
    """
    serializer_class = ProdutoSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = Produto.objects.select_related('categoria', 'marca').prefetch_related('imagens')
        is_admin = isinstance(self.request.user, Administrador)

        # Regra do Dicionário de Dados (Seção 6.3):
        # disponivel = FALSE oculta o produto do catálogo público, mas mantém visível no painel admin.
        if not is_admin:
            queryset = queryset.filter(disponivel=True)

        # Filtro por Categoria (?categoria=1 ou ?id_categoria=1)
        categoria = self.request.query_params.get('categoria') or self.request.query_params.get('id_categoria')
        if categoria:
            queryset = queryset.filter(categoria_id=categoria)

        # Filtro por Marca (?marca=1 ou ?id_marca=1)
        marca = self.request.query_params.get('marca') or self.request.query_params.get('id_marca')
        if marca:
            queryset = queryset.filter(marca_id=marca)

        # Busca textual (RF06 / UC06 - ?search=iphone ou ?q=iphone)
        busca = self.request.query_params.get('search') or self.request.query_params.get('q')
        if busca:
            queryset = queryset.filter(
                Q(nome__icontains=busca) |
                Q(descricao__icontains=busca) |
                Q(especificacoes__icontains=busca) |
                Q(marca__nome__icontains=busca) |
                Q(categoria__nome__icontains=busca)
            )

        # Filtro de faixa de preço (?preco_min=100&preco_max=5000)
        preco_min = self.request.query_params.get('preco_min')
        preco_max = self.request.query_params.get('preco_max')
        if preco_min:
            queryset = queryset.filter(preco__gte=preco_min)
        if preco_max:
            queryset = queryset.filter(preco__lte=preco_max)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """
        UC03 - Visualizar Detalhes do Produto
        Fluxo de Exceção: Produto sem estoque/indisponível -> "Produto indisponível no momento"
        """
        try:
            produto = Produto.objects.select_related('categoria', 'marca').prefetch_related('imagens').get(
                pk=kwargs.get('pk')
            )
        except Produto.DoesNotExist:
            return Response({'erro': 'Produto não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        is_admin = isinstance(request.user, Administrador)
        if not produto.disponivel and not is_admin:
            return Response(
                {'erro': 'Produto indisponível no momento'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(produto)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='destaques')
    def destaques(self, request):
        """RF01 / UC01 - Retorna os produtos mais recentes disponíveis para a Homepage."""
        produtos = self.get_queryset()[:8]
        serializer = self.get_serializer(produtos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminAuthenticated], url_path='imagens')
    def adicionar_imagem(self, request, pk=None):
        """Adiciona uma nova imagem à galeria de um produto existente."""
        produto = self.get_object()
        serializer = ImagemProdutoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if serializer.validated_data.get('principal'):
            produto.imagens.update(principal=False)

        imagem = serializer.save(produto=produto)
        return Response(ImagemProdutoSerializer(imagem).data, status=status.HTTP_201_CREATED)