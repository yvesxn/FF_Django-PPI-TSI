document.addEventListener("DOMContentLoaded", function () {
    var container = document.querySelector(".avaliacoes-slide-container");
    var btnPrev = document.getElementById("btn-prev");
    var btnNext = document.getElementById("btn-next");

    if (!container || !btnPrev || !btnNext) return;

    var card = container.querySelector(".avaliacao-card");
    var slide = container.querySelector(".avaliacoes-slide");
    if (!card || !slide) return;

    function rolar(direcao) {
        var distanciaScroll = card.getBoundingClientRect().width +
            parseFloat(getComputedStyle(slide).columnGap || 0);
        container.scrollBy({ left: distanciaScroll * direcao, behavior: "smooth" });
    }

    btnNext.addEventListener("click", function () {
        rolar(1);
    });

    btnPrev.addEventListener("click", function () {
        rolar(-1);
    });
});