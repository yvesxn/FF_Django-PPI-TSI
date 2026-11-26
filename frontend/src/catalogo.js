const API_URL = "http://localhost:3000/api/produtos";
const API_ORIGEM = "http://localhost:3000";
const ITENS_POR_PAGINA = 8;

const containerProdutos = document.querySelector(".produtos-container");
const mensagemSemResultados = document.getElementById("sem-resultados");
const resumoFiltros = document.getElementById("resumo-filtros");
const botaoAplicarFiltros = document.getElementById("aplicar-filtros");
const paginacaoContainer = document.querySelector(".pag-altern");
let todosProdutos = [];
let paginaAtual = 1;

const filtrosAtivos = {
    categoria: new Set(),
    marca: new Set()
};

function normalizarSlug(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterUrlImagem(produto) {
    const url = produto.imagem_principal
        || produto.imagens?.find((img) => img.principal)?.url_imagem
        || produto.imagens?.[0]?.url_imagem
        || null;

    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("img/")) {
        return url;
    }
    return `${API_ORIGEM}${url.startsWith("/") ? "" : "/"}${url}`;
}

function criarCardProduto(produto) {
    const card = document.createElement("div");
    card.classList.add("produto-card");

    const nomeCat = produto.categoria_nome || produto.categoria?.nome || "Categoria não informada";
    const nomeMarca = produto.marca_nome || produto.marca?.nome || "Marca não informada";

    card.dataset.productId = produto.id_produto;
    card.dataset.categoria = normalizarSlug(nomeCat);
    card.dataset.marca = normalizarSlug(nomeMarca);

    const urlImagem = obterUrlImagem(produto);

    if (urlImagem) {
        const img = document.createElement("img");
        img.src = urlImagem;
        img.alt = produto.nome;
        img.loading = "lazy";
        card.appendChild(img);
    } else {
        const placeholder = document.createElement("div");
        placeholder.classList.add("produto-imagem-placeholder");
        placeholder.textContent = "Imagem indisponível";
        card.appendChild(placeholder);
    }

    const nome = document.createElement("h3");
    nome.textContent = produto.nome;

    const categoria = document.createElement("p");
    categoria.textContent = nomeCat;

    const marca = document.createElement("p");
    marca.textContent = nomeMarca;

    const preco = document.createElement("p");
    preco.textContent = formatarPreco(produto.preco);

    const disponibilidade = document.createElement("p");
    if (produto.disponivel) {
        disponibilidade.textContent = "Disponível";
        disponibilidade.classList.add("produto-disponivel");
    } else {
        disponibilidade.textContent = "Indisponível";
        disponibilidade.classList.add("produto-indisponivel");
    }

    const botao = document.createElement("button");
    botao.classList.add("btn", "btn-success");
    botao.textContent = "Ver Produto";

    botao.addEventListener("click", () => {
        window.location.href = `produto.html?id=${encodeURIComponent(produto.id_produto)}`;
    });

    card.append(nome, categoria, marca, preco, disponibilidade, botao);

    return card;
}

function obterProdutosFiltrados() {
    return todosProdutos.filter((produto) => {
        const slugCat = normalizarSlug(produto.categoria_nome || produto.categoria?.nome);
        const slugMarca = normalizarSlug(produto.marca_nome || produto.marca?.nome);

        const passaCategoria =
            filtrosAtivos.categoria.size === 0 ||
            filtrosAtivos.categoria.has(slugCat);

        const passaMarca =
            filtrosAtivos.marca.size === 0 ||
            filtrosAtivos.marca.has(slugMarca);

        return passaCategoria && passaMarca;
    });
}

function atualizarContadoresEResumo(totalFiltrado) {
    const chips = document.querySelectorAll(".filtro-chip");

    chips.forEach((chip) => {
        const grupo = chip.dataset.filterGroup;
        const valor = normalizarSlug(chip.dataset.filterValue);
        const contadorEl = chip.querySelector(".filtro-chip-count");

        if (!contadorEl) return;

        const quantidade = todosProdutos.filter((produto) => {
            const slugCat = normalizarSlug(produto.categoria_nome || produto.categoria?.nome);
            const slugMarca = normalizarSlug(produto.marca_nome || produto.marca?.nome);

            if (grupo === "categoria") {
                const passaMarca =
                    filtrosAtivos.marca.size === 0 ||
                    filtrosAtivos.marca.has(slugMarca);
                return slugCat === valor && passaMarca;
            }

            if (grupo === "marca") {
                const passaCat =
                    filtrosAtivos.categoria.size === 0 ||
                    filtrosAtivos.categoria.has(slugCat);
                return slugMarca === valor && passaCat;
            }

            return false;
        }).length;

        contadorEl.textContent = String(quantidade);
    });

    const totalFiltros = filtrosAtivos.categoria.size + filtrosAtivos.marca.size;
    if (resumoFiltros) {
        const textoFiltros = `${totalFiltros} filtro${totalFiltros === 1 ? "" : "s"} ativo${totalFiltros === 1 ? "" : "s"}`;
        const textoProdutos = `${totalFiltrado} produto${totalFiltrado === 1 ? "" : "s"}`;
        resumoFiltros.textContent = `${textoFiltros} · ${textoProdutos}`;
    }
}

function renderizarPaginacao(totalItens) {
    if (!paginacaoContainer) return;

    const totalPaginas = Math.max(1, Math.ceil(totalItens / ITENS_POR_PAGINA));

    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
    }

    if (totalItens === 0 || totalPaginas <= 1) {
        paginacaoContainer.hidden = true;
        return;
    }

    paginacaoContainer.hidden = false;
    paginacaoContainer.innerHTML = "";

    const btnAnterior = document.createElement("button");
    btnAnterior.className = "anterior";
    btnAnterior.type = "button";
    btnAnterior.textContent = "Anterior";
    btnAnterior.disabled = paginaAtual <= 1;
    btnAnterior.addEventListener("click", () => {
        if (paginaAtual > 1) {
            paginaAtual--;
            renderizarCatalogo();
        }
    });
    paginacaoContainer.appendChild(btnAnterior);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnNum = document.createElement("button");
        btnNum.className = "num";
        btnNum.type = "button";
        btnNum.textContent = String(i);
        if (i === paginaAtual) {
            btnNum.classList.add("ativa");
            btnNum.setAttribute("aria-current", "page");
        }
        btnNum.addEventListener("click", () => {
            paginaAtual = i;
            renderizarCatalogo();
        });
        paginacaoContainer.appendChild(btnNum);
    }

    const inputPagina = document.createElement("input");
    inputPagina.type = "number";
    inputPagina.placeholder = "...";
    inputPagina.min = "1";
    inputPagina.max = String(totalPaginas);
    inputPagina.setAttribute("aria-label", "Ir para página");
    inputPagina.addEventListener("change", () => {
        const destino = Number(inputPagina.value);
        if (Number.isInteger(destino) && destino >= 1 && destino <= totalPaginas) {
            paginaAtual = destino;
            renderizarCatalogo();
        }
    });
    paginacaoContainer.appendChild(inputPagina);

    const btnProximo = document.createElement("button");
    btnProximo.className = "proximo";
    btnProximo.type = "button";
    btnProximo.textContent = "Próximo";
    btnProximo.disabled = paginaAtual >= totalPaginas;
    btnProximo.addEventListener("click", () => {
        if (paginaAtual < totalPaginas) {
            paginaAtual++;
            renderizarCatalogo();
        }
    });
    paginacaoContainer.appendChild(btnProximo);
}

function renderizarCatalogo() {
    const filtrados = obterProdutosFiltrados();
    atualizarContadoresEResumo(filtrados.length);

    containerProdutos
        .querySelectorAll(".produto-card")
        .forEach(card => card.remove());

    if (filtrados.length === 0) {
        mensagemSemResultados.hidden = false;
        mensagemSemResultados.textContent = "Nenhum produto encontrado.";
        renderizarPaginacao(0);
        return;
    }

    mensagemSemResultados.hidden = true;

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
    }

    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const paginaItens = filtrados.slice(inicio, fim);

    paginaItens.forEach((produto) => {
        const card = criarCardProduto(produto);
        if (paginacaoContainer) {
            containerProdutos.insertBefore(card, paginacaoContainer);
        } else {
            containerProdutos.appendChild(card);
        }
    });

    renderizarPaginacao(filtrados.length);
}

function configurarFiltros() {
    const params = new URLSearchParams(window.location.search);
    const catParam = normalizarSlug(params.get("categoria"));
    const marcaParam = normalizarSlug(params.get("marca"));

    if (catParam) filtrosAtivos.categoria.add(catParam);
    if (marcaParam) filtrosAtivos.marca.add(marcaParam);

    const chips = document.querySelectorAll(".filtro-chip");

    chips.forEach((chip) => {
        const grupo = chip.dataset.filterGroup;
        const valor = normalizarSlug(chip.dataset.filterValue);

        if (filtrosAtivos[grupo]?.has(valor)) {
            chip.setAttribute("aria-pressed", "true");
        }

        chip.addEventListener("click", () => {
            if (!filtrosAtivos[grupo]) return;

            const ativo = filtrosAtivos[grupo].has(valor);
            if (ativo) {
                filtrosAtivos[grupo].delete(valor);
                chip.setAttribute("aria-pressed", "false");
            } else {
                filtrosAtivos[grupo].add(valor);
                chip.setAttribute("aria-pressed", "true");
            }

            paginaAtual = 1;
            renderizarCatalogo();
        });
    });

    botaoAplicarFiltros?.addEventListener("click", () => {
        paginaAtual = 1;
        renderizarCatalogo();
        containerProdutos?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

async function carregarProdutos() {
    try {
        const resposta = await fetch(API_URL);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const dados = await resposta.json();
        todosProdutos = Array.isArray(dados) ? dados : (dados.produtos || dados.results || []);

        renderizarCatalogo();
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);

        mensagemSemResultados.hidden = false;
        mensagemSemResultados.textContent =
            "Não foi possível carregar os produtos. Tente novamente mais tarde.";
        if (paginacaoContainer) {
            paginacaoContainer.hidden = true;
        }
    }
}

configurarFiltros();
carregarProdutos();