# F&F Imports — API REST & Catálogo Web

Sistema web e API RESTful desenvolvidos para a **F&F Imports** (Feira dos Importados — Brasília/DF), permitindo a divulgação pública do catálogo de produtos importados, filtragem por categoria e marca, redirecionamento direto para atendimento via WhatsApp e gerenciamento completo (CRUD) por meio de um painel administrativo autenticado via JWT.

---

## Tecnologias Utilizadas

* **Back-end:** Python 3.12+, Django 5.x, Django REST Framework (DRF)
* **Autenticação:** JWT (`PyJWT`) com hash de senhas via `bcrypt`
* **Banco de Dados:** MySQL 8.0+ (`mysqlclient`)
* **Front-end:** HTML5, CSS3 e JavaScript Vanilla (ES6+ / `Fetch API`)

---

## Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:

1. **Python 3.12+** (com `pip` e `venv`)
2. **MySQL Server 8.0+** (e opcionalmente o **MySQL Workbench**)
3. **Git**

---

## 1. Configuração e Acesso ao Banco de Dados (MySQL)

### 1.1. Criar o schema no MySQL
Acesse o seu cliente MySQL (terminal ou MySQL Workbench) com um usuário que tenha privilégios de criação (`root` ou equivalente) e execute:

```sql
CREATE DATABASE IF NOT EXISTS ff_django
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

*(Opcional)* Caso deseje criar um usuário dedicado para a aplicação em vez de utilizar o `root`:

```sql
CREATE USER 'ff_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON ff_django.* TO 'ff_user'@'localhost';
FLUSH PRIVILEGES;
```

### 1.2. Configurar as credenciais de conexão
Na raiz do projeto Django (onde se encontra o `manage.py`), crie ou edite o arquivo `.env` (ou verifique as variáveis em `ff_django/settings.py`) com os dados de acesso ao seu servidor MySQL:

```env
SECRET_KEY=sua-chave-secreta-django
DEBUG=True

DB_NAME=ff_django
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_HOST=127.0.0.1
DB_PORT=3306
```

> **Nota:** Certifique-se de que o serviço do MySQL esteja ativo na porta `3306` antes de rodar as migrações.

---

## 2. Instalação e Execução da API (Back-end)

### 2.1. Clonar o repositório e ativar o ambiente virtual
```bash
git clone <URL_DO_REPOSITORIO>
cd ff_django

# Criar o ambiente virtual
python -m venv .venv

# Ativar no Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Ativar no Linux / macOS
source .venv/bin/activate
```

### 2.2. Instalar as dependências
```bash
pip install -r requirements.txt
```
*(Caso o `requirements.txt` não esteja presente, instale manualmente: `pip install django djangorestframework django-cors-headers mysqlclient PyJWT bcrypt python-dotenv`)*

### 2.3. Aplicar as migrações (criar tabelas no MySQL)
```bash
python manage.py migrate
```
Esse comando cria automaticamente as tabelas `administrador`, `categoria`, `marca`, `produto` e `imagem_produto` no banco `ff_django`.

### 2.4. Criar o usuário Administrador e dados iniciais
Para conseguir acessar o painel administrativo (`login.html`), execute o comando customizado para gerar o administrador padrão:

```bash
python manage.py criar_admin
```

* **E-mail padrão:** `admin@ffimports.com`
* **Senha padrão:** `123456`

*(Opcional)* Para popular categorias e marcas iniciais diretamente no MySQL:
```sql
USE ff_django;

INSERT INTO categoria (nome, descricao) VALUES
  ('Smartphones', 'Aparelhos celulares importados'),
  ('Smartwatches', 'Relógios inteligentes'),
  ('Fones de Ouvido', 'Fones Bluetooth e com fio'),
  ('Consoles & Games', 'Videogames e acessórios'),
  ('Acessórios', 'Capinhas, carregadores e cabos');

INSERT INTO marca (nome) VALUES
  ('Apple'),
  ('Samsung'),
  ('Xiaomi'),
  ('Sony'),
  ('JBL');
```

### 2.5. Iniciar o servidor da API
Inicie o Django na porta **`3000`** (porta configurada nos arquivos `.js` do front-end):

```bash
python manage.py runserver 3000
```

A API estará disponível em: **`http://localhost:3000/api/`**

---

## 3. Executando o Front-end

1. Abra a pasta `src/` do projeto.
2. Execute o arquivo `index.html` utilizando a extensão **Live Server** no VS Code (ou abra diretamente no navegador).
3. Para acessar a área administrativa, clique em **Admin** no menu superior (ou abra `login.html`) e entre com as credenciais criadas no passo **2.4**.

---

## 4. Principais Endpoints da API

| Método | Endpoint | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Público | Autentica o administrador e retorna o token JWT |
| `GET` | `/api/auth/me` | Admin (JWT) | Retorna os dados do administrador logado |
| `GET` | `/api/produtos` | Público / Admin | Lista produtos (público vê apenas `disponivel=True`) |
| `GET` | `/api/produtos/destaques` | Público | Lista os 8 produtos disponíveis mais recentes |
| `GET` | `/api/produtos/<id>` | Público | Detalhes de um produto específico e suas imagens |
| `POST` | `/api/produtos` | Admin (JWT) | Cadastra um novo produto |
| `PUT` | `/api/produtos/<id>` | Admin (JWT) | Atualiza um produto existente |
| `DELETE` | `/api/produtos/<id>` | Admin (JWT) | Remove um produto do catálogo |
| `GET` | `/api/categorias` | Público | Lista todas as categorias |
| `GET` | `/api/marcas` | Público | Lista todas as marcas |

---

## Estrutura do Projeto

```text
ff_django/
├── api/                        # Aplicação Django REST Framework
│   ├── management/commands/    # Comandos customizados (criar_admin.py)
│   ├── migrations/             # Migrações do banco MySQL
│   ├── authentication.py       # Autenticação JWT para administradores
│   ├── models.py               # Modelos (Administrador, Produto, Categoria, Marca, ImagemProduto)
│   ├── permissions.py          # Permissões de leitura pública e escrita restrita
│   ├── serializers.py          # Serialização e validação JSON
│   ├── urls.py                 # Rotas da API
│   └── views.py                # ViewSets e regras de negócio
├── ff_django/                  # Configurações principais do projeto Django (settings.py)
├── src/                        # Front-end (HTML, CSS, JS)
│   ├── index.html              # Página inicial
│   ├── catalogo.html           # Catálogo com filtros e paginação
│   ├── produto.html            # Página de detalhes do produto
│   ├── login.html              # Tela de login administrativo
│   └── painel-novo-produto.html# Painel CRUD de produtos
├── manage.py
└── requirements.txt
```