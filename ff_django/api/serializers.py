from rest_framework import serializers
from .models import Administrador, Categoria, Marca, Produto, ImagemProduto


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(
        error_messages={
            'required': 'Campo obrigatório',
            'blank': 'Campo obrigatório',
            'invalid': 'E-mail inválido',
        }
    )
    senha = serializers.CharField(
        write_only=True,
        error_messages={
            'required': 'Campo obrigatório',
            'blank': 'Campo obrigatório',
        }
    )


class AdministradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Administrador
        fields = ['id_admin', 'nome', 'email', 'criado_em']


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id_categoria', 'nome', 'descricao', 'icone_url']


class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ['id_marca', 'nome', 'logo_url']


class ImagemProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemProduto
        fields = ['id_imagem', 'url_imagem', 'principal', 'ordem']


class ProdutoSerializer(serializers.ModelSerializer):
    imagens = ImagemProdutoSerializer(many=True, required=False)
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    marca_nome = serializers.CharField(source='marca.nome', read_only=True)
    imagem_principal = serializers.SerializerMethodField()

    # Mapeamento explícito para aceitar id_categoria e id_marca no JSON (como no Prisma/MySQL)
    id_categoria = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source='categoria',
        error_messages={'required': 'Preencha todos os campos', 'null': 'Preencha todos os campos'}
    )
    id_marca = serializers.PrimaryKeyRelatedField(
        queryset=Marca.objects.all(),
        source='marca',
        error_messages={'required': 'Preencha todos os campos', 'null': 'Preencha todos os campos'}
    )

    class Meta:
        model = Produto
        fields = [
            'id_produto',
            'nome',
            'descricao',
            'preco',
            'especificacoes',
            'disponivel',
            'id_categoria',
            'categoria_nome',
            'id_marca',
            'marca_nome',
            'imagem_principal',
            'imagens',
            'criado_em',
        ]
        extra_kwargs = {
            'nome': {'error_messages': {'required': 'Preencha todos os campos', 'blank': 'Preencha todos os campos'}},
            'preco': {'error_messages': {'required': 'Preencha todos os campos', 'null': 'Preencha todos os campos'}},
        }

    def get_imagem_principal(self, obj):
        img = obj.imagens.filter(principal=True).first() or obj.imagens.first()
        return img.url_imagem if img else None

    def _salvar_imagens(self, produto: Produto, imagens_data: list):
        if not imagens_data:
            return
        # Garante que apenas uma imagem seja principal
        tem_principal = any(img.get('principal', False) for img in imagens_data)
        for idx, img_data in enumerate(imagens_data, start=1):
            is_principal = img_data.get('principal', False)
            if not tem_principal and idx == 1:
                is_principal = True
            ImagemProduto.objects.create(
                produto=produto,
                url_imagem=img_data['url_imagem'],
                principal=is_principal,
                ordem=img_data.get('ordem', idx),
            )

    def create(self, validated_data):
        imagens_data = validated_data.pop('imagens', [])
        produto = Produto.objects.create(**validated_data)
        self._salvar_imagens(produto, imagens_data)
        return produto

    def update(self, instance, validated_data):
        imagens_data = validated_data.pop('imagens', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if imagens_data is not None:
            instance.imagens.all().delete()
            self._salvar_imagens(instance, imagens_data)

        return instance