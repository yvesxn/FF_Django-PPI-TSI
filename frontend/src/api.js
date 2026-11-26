const API_BASE_URL = 'http://localhost:3000/api';
const WHATSAPP_NUMERO = '5561983368829'; // Número exibido nos protótipos (Apêndice D)

const ApiService = {
    getToken() {
        return localStorage.getItem('ff_admin_token');
    },

    setSession(token, admin) {
        localStorage.setItem('ff_admin_token', token);
        localStorage.setItem('ff_admin_user', JSON.stringify(admin));
    },

    clearSession() {
        localStorage.removeItem('ff_admin_token');
        localStorage.removeItem('ff_admin_user');
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 204) return null;

        const data = await response.json();
        if (!response.ok) {
            const mensagem = data.erro || data.detail || Object.values(data).flat().join(', ') || 'Erro na requisição';
            throw new Error(mensagem);
        }
        return data;
    },

    // Endpoints Públicos (RF01, RF02, RF03, RF06)
    getProdutosDestaques() {
        return this.request('/produtos/destaques');
    },

    getProdutos(filtros = {}) {
        const params = new URLSearchParams();
        if (filtros.categoria) params.append('categoria', filtros.categoria);
        if (filtros.marca) params.append('marca', filtros.marca);
        if (filtros.search) params.append('search', filtros.search);
        if (filtros.preco_min) params.append('preco_min', filtros.preco_min);
        if (filtros.preco_max) params.append('preco_max', filtros.preco_max);

        const query = params.toString();
        return this.request(`/produtos${query ? `?${query}` : ''}`);
    },

    getProdutoById(id) {
        return this.request(`/produtos/${id}`);
    },

    getCategorias() {
        return this.request('/categorias');
    },

    getMarcas() {
        return this.request('/marcas');
    },

    // Endpoints Administrativos (RF07, RF08)
    async login(email, senha) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha })
        });
        this.setSession(data.token, data.administrador);
        return data;
    },

    criarProduto(payload) {
        return this.request('/produtos', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    atualizarProduto(id, payload) {
        return this.request(`/produtos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    excluirProduto(id) {
        return this.request(`/produtos/${id}`, {
            method: 'DELETE'
        });
    },

    // Helpers
    formatarPreco(valor) {
        return Number(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    },

    gerarLinkWhatsApp(nomeProduto) {
        const texto = encodeURIComponent(`Olá! Tenho interesse no produto: ${nomeProduto}`);
        return `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`;
    }
};