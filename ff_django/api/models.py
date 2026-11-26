from django.db import models

# Create your models here.
import bcrypt
from django.db import models
from django.core.validators import MinValueValidator


class Administrador(models.Model):
    id_admin = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=200, unique=True)
    nome = models.CharField(max_length=150)
    senha = models.CharField(max_length=255)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'administrador'

    def set_senha(self, raw_password: str):
        hashed = bcrypt.hashpw(raw_password.encode('utf-8'), bcrypt.gensalt())
        self.senha = hashed.decode('utf-8')

    def check_senha(self, raw_password: str) -> bool:
        if not self.senha:
            return False
        # Compatível com hashes bcrypt gerados pelo Node.js ($2a$ ou $2b$)
        return bcrypt.checkpw(
            raw_password.encode('utf-8'),
            self.senha.encode('utf-8')
        )

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return f"{self.nome} ({self.email})"


class Categoria(models.Model):
    id_categoria = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(null=True, blank=True)
    icone_url = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        db_table = 'categoria'

    def __str__(self):
        return self.nome


class Marca(models.Model):
    id_marca = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=100, unique=True)
    logo_url = models.CharField(max_length=300, null=True, blank=True)

    class Meta:
        db_table = 'marca'

    def __str__(self):
        return self.nome


class Produto(models.Model):
    id_produto = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=150, db_index=True)
    descricao = models.TextField(null=True, blank=True)
    preco = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    especificacoes = models.TextField(null=True, blank=True)
    disponivel = models.BooleanField(default=True, db_index=True)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,  # Equivalente ao ON DELETE RESTRICT do DDL
        db_column='id_categoria',
        related_name='produtos'
    )
    marca = models.ForeignKey(
        Marca,
        on_delete=models.PROTECT,  # Equivalente ao ON DELETE RESTRICT do DDL
        db_column='id_marca',
        related_name='produtos'
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'produto'
        ordering = ['-criado_em']

    def __str__(self):
        return self.nome


class ImagemProduto(models.Model):
    id_imagem = models.AutoField(primary_key=True)
    produto = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        db_column='id_produto',
        related_name='imagens'
    )
    url_imagem = models.TextField()
    principal = models.BooleanField(default=False)
    ordem = models.IntegerField(default=1, validators=[MinValueValidator(1)])

    class Meta:
        db_table = 'imagem_produto'
        ordering = ['-principal', 'ordem', 'id_imagem']

    def __str__(self):
        return f"Imagem {self.id_imagem} - {self.produto.nome}"