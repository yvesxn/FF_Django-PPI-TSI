const API_URL = "http://localhost:3000/api/produtos";
const API_ORIGEM = "http://localhost:3000";

const carrossel = document.getElementById("carrossel-produtos");

async function carregarCarrossel() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os produtos.");
        }

        const dados = await resposta.json();

        // A API retorna os produtos dentro de "produtos"
        const produtos = dados.produtos.filter(produto =>
            produto.disponivel &&
            produto.excluido_em === null
        );

        // Monta os elementos do carrossel
        const criarImagemProduto = (produto) => {
            const imagemPrincipal = produto.imagem_produto?.find(
                imagem => imagem.principal
            ) || produto.imagem_produto?.[0];

            if (!imagemPrincipal) return null;

            const link = document.createElement("a");
            link.href = `produto.html?id=${produto.id_produto}`;
            link.classList.add("item-carrossel");

            const imagem = document.createElement("img");

            imagem.src = imagemPrincipal.url_imagem.startsWith("http")
                ? imagemPrincipal.url_imagem
                : `${API_ORIGEM}${imagemPrincipal.url_imagem}`;

            imagem.alt = produto.nome;
            imagem.loading = "lazy";

            link.appendChild(imagem);

            return link;
        };

        const elementos = produtos
            .map(criarImagemProduto)
            .filter(elemento => elemento !== null);

        if (elementos.length === 0) {
            carrossel.textContent = "Nenhum produto com imagem disponível.";
            return;
        }

        // Primeira sequência
        elementos.forEach(elemento => {
            carrossel.appendChild(elemento);
        });

        // Segunda sequência para criar o efeito contínuo
        elementos.forEach(elemento => {
            const copia = elemento.cloneNode(true);
            copia.setAttribute("aria-hidden", "true");
            carrossel.appendChild(copia);
        });

    } catch (erro) {
        console.error("Erro ao carregar carrossel:", erro);
        carrossel.textContent = "Não foi possível carregar os produtos.";
    }
}

carregarCarrossel();