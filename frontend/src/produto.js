const API_BASE = "http://localhost:3000/api";
const API_ORIGEM = "http://localhost:3000";
const WHATSAPP_NUMERO = "5561982008929";

function formatarPrecoBRL(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function resolverUrlImagem(url) {
    if (!url) return "img/celular.jpg";
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("img/")) {
        return url;
    }
    return `${API_ORIGEM}${url.startsWith("/") ? "" : "/"}${url}`;
}

function gerarLinkWhatsApp(nomeProduto) {
    const texto = encodeURIComponent(`Olá! Tenho interesse no produto: ${nomeProduto}`);
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`;
}

function renderizarFichaTecnica(painelEl, especificacoes, categoriaNome, marcaNome) {
    if (!painelEl) return;
    painelEl.innerHTML = "";

    const linhas = [];

    if (marcaNome) linhas.push({ chave: "Marca", valor: marcaNome });
    if (categoriaNome) linhas.push({ chave: "Categoria", valor: categoriaNome });

    if (especificacoes) {
        especificacoes
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((linha) => {
                const separadorIdx = linha.indexOf(":");
                if (separadorIdx > 0) {
                    linhas.push({
                        chave: linha.slice(0, separadorIdx).trim(),
                        valor: linha.slice(separadorIdx + 1).trim()
                    });
                } else {
                    linhas.push({ chave: "Especificação", valor: linha });
                }
            });
    }

    if (linhas.length === 0) {
        painelEl.innerHTML = "<p>Nenhuma informação técnica cadastrada para este produto.</p>";
        return;
    }

    const lista = document.createElement("dl");
    lista.className = "ficha-lista";

    linhas.forEach(({ chave, valor }) => {
        const item = document.createElement("div");
        item.className = "ficha-linha";

        const dt = document.createElement("dt");
        dt.textContent = chave;

        const dd = document.createElement("dd");
        dd.textContent = valor;

        item.append(dt, dd);
        lista.appendChild(item);
    });

    painelEl.appendChild(lista);
}

async function carregarProdutosRelacionados(produtoAtual) {
    const containerRelacionados = document.getElementById("produtos-relacionados");
    if (!containerRelacionados) return;

    try {
        const resposta = await fetch(`${API_BASE}/produtos`);
        if (!resposta.ok) return;

        const dados = await resposta.json();
        const lista = Array.isArray(dados) ? dados : (dados.produtos || dados.results || []);

        // Prioriza produtos da mesma categoria (excluindo o atual) e completa com outros recentes
        const outros = lista.filter((p) => Number(p.id_produto) !== Number(produtoAtual.id_produto));
        const mesmaCategoria = outros.filter((p) => Number(p.id_categoria) === Number(produtoAtual.id_categoria));
        const restantes = outros.filter((p) => Number(p.id_categoria) !== Number(produtoAtual.id_categoria));
        const selecionados = [...mesmaCategoria, ...restantes].slice(0, 4);

        if (selecionados.length === 0) {
            containerRelacionados.innerHTML = "<p>Nenhum outro produto disponível no momento.</p>";
            return;
        }

        containerRelacionados.innerHTML = "";

        selecionados.forEach((item) => {
            const card = document.createElement("article");
            card.className = "produto-card";

            const img = document.createElement("img");
            const urlImg = item.imagem_principal || item.imagens?.[0]?.url_imagem;
            img.src = resolverUrlImagem(urlImg);
            img.alt = item.nome;
            img.loading = "lazy";

            const titulo = document.createElement("h3");
            titulo.textContent = item.nome;

            const marca = document.createElement("p");
            marca.textContent = item.marca_nome || "";

            const preco = document.createElement("p");
            preco.textContent = formatarPrecoBRL(item.preco);

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "btn btn-success";
            botao.textContent = "Ver Produto";
            botao.addEventListener("click", () => {
                window.location.href = `produto.html?id=${encodeURIComponent(item.id_produto)}`;
            });

            card.append(img, titulo, marca, preco, botao);
            containerRelacionados.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro ao carregar produtos relacionados:", erro);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const produtoId = params.get("id");

    const statusEl = document.getElementById("produto-status");
    const secaoDetalhe = document.querySelector(".produto-detalhe");
    const secaoDescricao = document.querySelector(".produto-descricao");
    const secaoFicha = document.querySelector(".produto-ficha");

    if (!produtoId) {
        window.location.href = "catalogo.html";
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE}/produtos/${encodeURIComponent(produtoId)}`);
        const produto = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(produto.erro || "Produto indisponível no momento.");
        }

        document.title = `${produto.nome} - F&F Imports`;

        // Preenche cabeçalho e informações principais
        const elCategoria = document.getElementById("produto-categoria");
        const elNome = document.getElementById("produto-nome");
        const elMarca = document.getElementById("produto-marca");
        const elResumo = document.getElementById("produto-resumo");
        const elPreco = document.getElementById("produto-preco");
        const elDisponibilidade = document.getElementById("produto-disponibilidade");
        const elBtnWhatsapp = document.getElementById("produto-whatsapp");
        const elDescricao = document.getElementById("produto-descricao");
        const elFichaPainel = document.getElementById("produto-ficha-painel");
        const elImgPrincipal = document.getElementById("produto-imagem");
        const elMiniaturas = document.getElementById("produto-miniaturas");

        if (elCategoria) elCategoria.textContent = produto.categoria_nome || "Categoria não informada";
        if (elNome) elNome.textContent = produto.nome;
        if (elMarca) elMarca.textContent = produto.marca_nome ? `Marca: ${produto.marca_nome}` : "";

        if (elResumo) {
            const textoBase = produto.descricao || "";
            elResumo.textContent = textoBase.length > 140 ? `${textoBase.slice(0, 140).trim()}...` : textoBase;
        }

        if (elPreco) elPreco.textContent = formatarPrecoBRL(produto.preco);

        if (elDisponibilidade) {
            elDisponibilidade.textContent = produto.disponivel ? "Disponível" : "Indisponível";
            elDisponibilidade.classList.toggle("disponivel", Boolean(produto.disponivel));
            elDisponibilidade.classList.toggle("indisponivel", !produto.disponivel);
        }

        if (elBtnWhatsapp) {
            elBtnWhatsapp.href = gerarLinkWhatsApp(produto.nome);
        }

        if (elDescricao) {
            elDescricao.textContent = produto.descricao || "Sem descrição adicional cadastrada.";
        }

        renderizarFichaTecnica(
            elFichaPainel,
            produto.especificacoes,
            produto.categoria_nome,
            produto.marca_nome
        );

        // Imagem principal e miniaturas
        const imagens = Array.isArray(produto.imagens) ? produto.imagens : [];
        const urlPrincipal = resolverUrlImagem(
            produto.imagem_principal
            || imagens.find((img) => img.principal)?.url_imagem
            || imagens[0]?.url_imagem
        );

        if (elImgPrincipal) {
            elImgPrincipal.src = urlPrincipal;
            elImgPrincipal.alt = produto.nome;
        }

        if (elMiniaturas) {
            elMiniaturas.innerHTML = "";
            const listaThumbs = imagens.length > 0 ? imagens : [{ url_imagem: urlPrincipal, principal: true }];

            listaThumbs.forEach((imgObj, index) => {
                const urlThumb = resolverUrlImagem(imgObj.url_imagem);
                const btnThumb = document.createElement("button");
                btnThumb.type = "button";
                btnThumb.className = `produto-miniatura ${index === 0 ? "ativa" : ""}`;
                btnThumb.setAttribute("aria-label", `Ver imagem ${index + 1} de ${produto.nome}`);

                const thumbImg = document.createElement("img");
                thumbImg.src = urlThumb;
                thumbImg.alt = `${produto.nome} - foto ${index + 1}`;

                btnThumb.appendChild(thumbImg);
                btnThumb.addEventListener("click", () => {
                    if (elImgPrincipal) elImgPrincipal.src = urlThumb;
                    elMiniaturas.querySelectorAll(".produto-miniatura").forEach((b) => b.classList.remove("ativa"));
                    btnThumb.classList.add("ativa");
                });

                elMiniaturas.appendChild(btnThumb);
            });
        }

        // Exibe a secção principal e oculta a mensagem de carregamento
        if (statusEl) statusEl.hidden = true;
        if (secaoDetalhe) secaoDetalhe.hidden = false;

        await carregarProdutosRelacionados(produto);
    } catch (erro) {
        console.error("Erro ao carregar detalhes do produto:", erro);
        if (secaoDetalhe) secaoDetalhe.hidden = true;
        if (secaoDescricao) secaoDescricao.hidden = true;
        if (secaoFicha) secaoFicha.hidden = true;

        if (statusEl) {
            statusEl.hidden = false;
            statusEl.innerHTML = `
                ${erro.message} <a href="catalogo.html">Voltar ao catálogo</a>
            `;
        }
    }
});