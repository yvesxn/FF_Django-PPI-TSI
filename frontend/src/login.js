const API_LOGIN_URL = "http://localhost:3000/api/auth/login";
const TOKEN_KEY = "ff_admin_token";
const USER_KEY = "ff_admin_user";

document.addEventListener("DOMContentLoaded", () => {
    // Se já houver sessão ativa, redireciona direto para o painel
    const tokenExistente = localStorage.getItem(TOKEN_KEY);
    if (tokenExistente) {
        window.location.href = "painel-novo-produto.html";
        return;
    }

    const form = document.getElementById("login-form");
    const inputEmail = document.getElementById("email");
    const inputSenha = document.getElementById("senha");
    const mensagemEl = document.getElementById("login-mensagem");
    const btnEntrar = document.getElementById("btn-entrar");
    const linkEsqueci = document.getElementById("forgot-password");

    function exibirMensagem(texto, tipo = "erro") {
        mensagemEl.textContent = texto;
        mensagemEl.classList.toggle("info", tipo === "info");
        mensagemEl.hidden = false;
    }

    function limparMensagem() {
        mensagemEl.hidden = true;
        mensagemEl.textContent = "";
        mensagemEl.classList.remove("info");
    }

    linkEsqueci?.addEventListener("click", (evento) => {
        evento.preventDefault();
        exibirMensagem(
            "Entre em contato com o suporte técnico da F&F Imports para redefinir sua senha.",
            "info"
        );
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limparMensagem();

        const email = inputEmail.value.trim();
        const senha = inputSenha.value;

        if (!email || !senha) {
            exibirMensagem("Preencha o e-mail e a senha.");
            return;
        }

        btnEntrar.disabled = true;
        btnEntrar.textContent = "Entrando...";

        try {
            const resposta = await fetch(API_LOGIN_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(dados.mensagem || "E-mail ou senha inválidos.");
            }

            if (!dados.token) {
                throw new Error("Resposta inválida do servidor.");
            }

            localStorage.setItem(TOKEN_KEY, dados.token);
            if (dados.administrador) {
                localStorage.setItem(USER_KEY, JSON.stringify(dados.administrador));
            }

            window.location.href = "painel-novo-produto.html";

        } catch (erro) {
            console.error("Erro no login:", erro);
            exibirMensagem(
                erro.message === "Failed to fetch"
                    ? "Não foi possível conectar ao servidor da API (http://localhost:3000)."
                    : erro.message
            );
        } finally {
            btnEntrar.disabled = false;
            btnEntrar.textContent = "Entrar";
        }
    });
});
