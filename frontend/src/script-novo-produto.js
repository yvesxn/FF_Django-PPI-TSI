const API_BASE = "http://localhost:3000/api";
const API_ORIGEM = "http://localhost:3000";
const TOKEN_KEY = "ff_admin_token";
const USER_KEY = "ff_admin_user";

const token = localStorage.getItem(TOKEN_KEY);

if (!token) {
    window.location.href = "login.html";
}

function encerrarSessao() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "login.html";
}

function headersAutenticados(json = true) {
    const headers = {
        Authorization: `Bearer ${token}`
    };
    if (json) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

function formatarPrecoBRL(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarPrecoInput(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function converterPrecoParaNumero(texto) {
    if (!texto) return NaN;
    const limpo = String(texto)
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
    return Number(limpo);
}

function lerArquivoComoDataURL(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = (e) => resolve(e.target.result);
        leitor.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));
        leitor.readAsDataURL(arquivo);
    });
}

function obterUrlImagemAdmin(produto) {
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

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const adminSalvo = JSON.parse(localStorage.getItem(USER_KEY) || "null");
        if (adminSalvo?.nome) {
            document.getElementById("admin-nome").textContent = adminSalvo.nome;
        }
    } catch (_) {
        // Ignora erro de parse
    }

    const menuProdutos = document.getElementById("menu-produtos");
    const menuAdicionar = document.getElementById("menu-adicionar");
    const menuSair = document.getElementById("menu-sair");

    const viewList = document.getElementById("view-list");
    const viewForm = document.getElementById("view-form");

    const feedbackEl = document.getElementById("admin-feedback");
    const statusText = document.getElementById("status-text");
    const productsContainer = document.getElementById("products-container");

    const formTitulo = document.getElementById("form-titulo");
    const formSubtitulo = document.getElementById("form-subtitulo");
    const cadastroForm = document.getElementById("cadastro-form");
    const areaUpload = document.getElementById("area-upload");
    const inputFoto = document.getElementById("input-foto");
    const previewImg = document.getElementById("preview-img");
    const nomeProd = document.getElementById("nome-prod");
    const categoriaProd = document.getElementById("categoria-prod");
    const marcaProd = document.getElementById("marca-prod");
    const precoProd = document.getElementById("preco-prod");
    const disponivelProd = document.getElementById("disponivel-prod");
    const especProd = document.getElementById("espec-prod");
    const descProd = document.getElementById("desc-prod");
    const btnSalvar = document.getElementById("save-product");
    const btnCancelar = document.getElementById("cancel-edit");

    let produtosCache = [];
    let produtoEditando = null;

    function mostrarFeedback(mensagem, tipo = "sucesso") {
        feedbackEl.textContent = mensagem;
        feedbackEl.classList.toggle("erro", tipo === "erro");
        feedbackEl.hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function ocultarFeedback() {
        feedbackEl.hidden = true;
        feedbackEl.textContent = "";
        feedbackEl.classList.remove("erro");
    }

    function resetarFormulario() {
        produtoEditando = null;
        cadastroForm.reset();
        inputFoto.value = "";
        previewImg.src = "";
        previewImg.style.display = "none";
        areaUpload.classList.remove("has-image");

        formTitulo.textContent = "Novo Produto";
        formSubtitulo.textContent = "Preencha as informações e adicione a imagem do item";
        btnSalvar.textContent = "Cadastrar produto";
        btnCancelar.classList.add("hidden");
    }

    function mostrarLista() {
        viewList.classList.remove("hidden");
        viewForm.classList.add("hidden");
        menuProdutos.classList.add("active");
        menuAdicionar.classList.remove("active");
    }

    function mostrarFormulario(modoEdicao = false) {
        if (!modoEdicao) {
            resetarFormulario();
        }
        viewList.classList.add("hidden");
        viewForm.classList.remove("hidden");
        menuProdutos.classList.remove("active");
        menuAdicionar.classList.add("active");
    }

    menuProdutos.addEventListener("click", () => {
        ocultarFeedback();
        resetarFormulario();
        mostrarLista();
    });

    menuAdicionar.addEventListener("click", () => {
        ocultarFeedback();
        mostrarFormulario(false);
    });

    btnCancelar.addEventListener("click", () => {
        ocultarFeedback();
        resetarFormulario();
        mostrarLista();
    });

    menuSair.addEventListener("click", () => {
        encerrarSessao();
    });

    inputFoto.addEventListener("change", () => {
        const arquivo = inputFoto.files?.[0];
        if (!arquivo) return;

        const leitor = new FileReader();
        leitor.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = "block";
            areaUpload.classList.add("has-image");
        };
        leitor.readAsDataURL(arquivo);
    });

    async function carregarCategoriasEMarcas() {
        try {
            const [resCat, resMarca] = await Promise.all([
                fetch(`${API_BASE}/categorias`),
                fetch(`${API_BASE}/marcas`)
            ]);

            if (resCat.ok) {
                const categorias = await resCat.json();
                categoriaProd.innerHTML = `<option value="">Selecione uma categoria</option>`;
                categorias.forEach((cat) => {
                    const opt = document.createElement("option");
                    opt.value = cat.id_categoria;
                    opt.textContent = cat.nome;
                    categoriaProd.appendChild(opt);
                });
            }

            if (resMarca.ok) {
                const marcas = await resMarca.json();
                marcaProd.innerHTML = `<option value="">Selecione uma marca</option>`;
                marcas.forEach((marca) => {
                    const opt = document.createElement("option");
                    opt.value = marca.id_marca;
                    opt.textContent = marca.nome;
                    marcaProd.appendChild(opt);
                });
            }
        } catch (erro) {
            console.error("Erro ao carregar categorias e marcas:", erro);
            mostrarFeedback("Não foi possível carregar categorias e marcas da API.", "erro");
        }
    }

    function iniciarEdicao(produto) {
        ocultarFeedback();
        produtoEditando = produto;

        formTitulo.textContent = "Editar Produto";
        formSubtitulo.textContent = `Editando: ${produto.nome}`;
        btnSalvar.textContent = "Salvar alterações";
        btnCancelar.classList.remove("hidden");

        nomeProd.value = produto.nome || "";
        categoriaProd.value = String(produto.id_categoria || "");
        marcaProd.value = String(produto.id_marca || "");
        precoProd.value = formatarPrecoInput(produto.preco);
        disponivelProd.value = produto.disponivel ? "true" : "false";
        especProd.value = produto.especificacoes || "";
        descProd.value = produto.descricao || "";
        inputFoto.value = "";

        const urlImg = obterUrlImagemAdmin(produto);
        if (urlImg) {
            previewImg.src = urlImg;
            previewImg.style.display = "block";
            areaUpload.classList.add("has-image");
        } else {
            previewImg.src = "";
            previewImg.style.display = "none";
            areaUpload.classList.remove("has-image");
        }

        mostrarFormulario(true);
    }

    async function excluirProduto(produto) {
        const confirmar = window.confirm(`Deseja realmente excluir o produto "${produto.nome}"?`);
        if (!confirmar) return;

        ocultarFeedback();

        try {
            const resposta = await fetch(`${API_BASE}/produtos/${produto.id_produto}`, {
                method: "DELETE",
                headers: headersAutenticados(false)
            });

            if (resposta.status === 401) {
                encerrarSessao();
                return;
            }

            if (!resposta.ok && resposta.status !== 204) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados.erro || dados.detail || "Erro ao excluir produto.");
            }

            mostrarFeedback(`Produto "${produto.nome}" excluído com sucesso.`);
            await carregarProdutos();
        } catch (erro) {
            console.error("Erro ao excluir produto:", erro);
            mostrarFeedback(erro.message, "erro");
        }
    }

    function renderizarProdutos() {
        productsContainer.innerHTML = "";

        if (produtosCache.length === 0) {
            statusText.textContent = "Nenhum produto cadastrado";
            return;
        }

        statusText.textContent = `${produtosCache.length} produto${produtosCache.length > 1 ? "s" : ""} cadastrado${produtosCache.length > 1 ? "s" : ""}`;

        produtosCache.forEach((produto) => {
            const card = document.createElement("article");
            card.className = "product-card";

            const imgBox = document.createElement("div");
            imgBox.className = "product-img-box";

            const urlImg = obterUrlImagemAdmin(produto);
            if (urlImg) {
                const img = document.createElement("img");
                img.src = urlImg;
                img.alt = produto.nome;
                imgBox.appendChild(img);
            } else {
                imgBox.textContent = "Sem foto";
            }

            const info = document.createElement("div");
            info.className = "info";

            const titulo = document.createElement("h2");
            titulo.textContent = produto.nome;

            const meta = document.createElement("div");
            meta.className = "meta-tags";

            const badgeCat = document.createElement("span");
            badgeCat.className = "meta-badge";
            badgeCat.textContent = produto.categoria_nome || produto.categoria?.nome || "Sem categoria";

            const badgeMarca = document.createElement("span");
            badgeMarca.className = "meta-badge";
            badgeMarca.textContent = produto.marca_nome || produto.marca?.nome || "Sem marca";

            const badgeDisp = document.createElement("span");
            badgeDisp.className = `meta-badge ${produto.disponivel ? "disponivel" : "indisponivel"}`;
            badgeDisp.textContent = produto.disponivel ? "Disponível" : "Indisponível";

            meta.append(badgeCat, badgeMarca, badgeDisp);

            const desc = document.createElement("p");
            desc.className = "desc";
            desc.textContent = produto.descricao || "Sem descrição cadastrada.";

            const price = document.createElement("p");
            price.className = "price";
            price.textContent = formatarPrecoBRL(produto.preco);

            info.append(titulo, meta, desc, price);

            const actions = document.createElement("div");
            actions.className = "card-actions";

            const btnEdit = document.createElement("button");
            btnEdit.type = "button";
            btnEdit.className = "btn-edit";
            btnEdit.textContent = "Editar";
            btnEdit.addEventListener("click", () => iniciarEdicao(produto));

            const btnDelete = document.createElement("button");
            btnDelete.type = "button";
            btnDelete.className = "btn-delete";
            btnDelete.textContent = "Excluir";
            btnDelete.addEventListener("click", () => excluirProduto(produto));

            actions.append(btnEdit, btnDelete);
            card.append(imgBox, info, actions);
            productsContainer.appendChild(card);
        });
    }

    async function carregarProdutos() {
        try {
            const resposta = await fetch(`${API_BASE}/produtos`, {
                headers: headersAutenticados(false)
            });
            if (resposta.status === 401) {
                encerrarSessao();
                return;
            }
            if (!resposta.ok) {
                throw new Error("Não foi possível carregar os produtos.");
            }
            const dados = await resposta.json();
            produtosCache = Array.isArray(dados) ? dados : (dados.produtos || dados.results || []);
            renderizarProdutos();
        } catch (erro) {
            console.error("Erro ao carregar produtos:", erro);
            statusText.textContent = "Erro ao conectar com a API.";
            mostrarFeedback("Não foi possível carregar a lista de produtos.", "erro");
        }
    }

    cadastroForm.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        ocultarFeedback();

        const nome = nomeProd.value.trim();
        const idCategoria = Number(categoriaProd.value);
        const idMarca = Number(marcaProd.value);
        const preco = converterPrecoParaNumero(precoProd.value);
        const disponivel = disponivelProd.value === "true";
        const especificacoes = especProd.value.trim() || null;
        const descricao = descProd.value.trim() || null;
        const arquivoImagem = inputFoto.files?.[0] || null;

        if (!nome) {
            mostrarFeedback("Informe o nome do produto.", "erro");
            return;
        }
        if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
            mostrarFeedback("Selecione uma categoria válida.", "erro");
            return;
        }
        if (!Number.isInteger(idMarca) || idMarca <= 0) {
            mostrarFeedback("Selecione uma marca válida.", "erro");
            return;
        }
        if (!Number.isFinite(preco) || preco < 0) {
            mostrarFeedback("Informe um preço válido (ex: 4999,90).", "erro");
            return;
        }

        btnSalvar.disabled = true;
        btnSalvar.textContent = produtoEditando ? "Salvando..." : "Cadastrando...";

        const payload = {
            nome,
            descricao,
            preco,
            especificacoes,
            disponivel,
            id_categoria: idCategoria,
            id_marca: idMarca
        };

        try {
            if (arquivoImagem) {
                const dataUrl = await lerArquivoComoDataURL(arquivoImagem);
                payload.imagens = [{ url_imagem: dataUrl, principal: true, ordem: 1 }];
            }

            const emEdicao = Boolean(produtoEditando);
            const url = emEdicao
                ? `${API_BASE}/produtos/${produtoEditando.id_produto}`
                : `${API_BASE}/produtos`;
            const metodo = emEdicao ? "PUT" : "POST";

            const resposta = await fetch(url, {
                method: metodo,
                headers: headersAutenticados(true),
                body: JSON.stringify(payload)
            });

            if (resposta.status === 401) {
                encerrarSessao();
                return;
            }

            const dados = await resposta.json().catch(() => ({}));
            if (!resposta.ok) {
                const mensagemErro = dados.erro || dados.detail || Object.values(dados).flat().join("; ") || "Erro ao salvar produto.";
                throw new Error(mensagemErro);
            }

            resetarFormulario();
            mostrarLista();
            await carregarProdutos();
            mostrarFeedback(
                emEdicao
                    ? "Produto atualizado com sucesso!"
                    : "Produto cadastrado com sucesso!"
            );
        } catch (erro) {
            console.error("Erro ao salvar produto:", erro);
            mostrarFeedback(erro.message, "erro");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = produtoEditando ? "Salvar alterações" : "Cadastrar produto";
        }
    });

    await carregarCategoriasEMarcas();
    await carregarProdutos();
});