import {
  formatCurrency,
  generateMonths,
  toCSV,
  downloadFile,
  addMonths,
  fetchInccFromTabela,
} from "./utils.js";

/**
 * Detecta bloqueador de anúncios criando elemento "bait" com classe comum de AdSense e verificando se foi removido ou ocultado.
 * @returns {Promise<boolean>} true se adblock detectado
 */
function detectAdBlock() {
  return new Promise((resolve) => {
    // Cria bait similar a elemento do AdSense
    const bait = document.createElement("ins");
    bait.className = "adsbygoogle";
    bait.style.cssText = "position:absolute;top:-999px;";
    document.body.appendChild(bait);

    window.setTimeout(() => {
      // Se o adblock removeu ou escondeu o elemento
      const computed = getComputedStyle(bait);
      const blocked =
        !document.body.contains(bait) ||
        computed.display === "none" ||
        bait.offsetParent === null ||
        bait.clientHeight === 0;
      if (document.body.contains(bait)) document.body.removeChild(bait);
      resolve(blocked);
    }, 100);
  });
}

(async function () {
  "use strict";

  // Detecta AdBlock e aplica aviso e oculta banners
  if (await detectAdBlock()) {
    console.warn("AdBlock detectado");
    // Mensagem não invasiva
    const msg = document.createElement("div");
    msg.id = "adblock-message";
    msg.textContent =
      "Olá! Percebi que você está usando um Adblock, eu sei como anúncios são um saco! Mas para continuar atualizando e fazendo mais projetos assim com dedicação e amor, preciso ganhar com anúncios, então por favor se puder desabilitar seu Adblock só por aqui, ficarei muito feliz :)";
    msg.style.cssText =
      "background: #fff3cd; " +
      "color: #856404; " +
      "border: 1px solid #ffeeba; " +
      "padding: 1rem; " +
      "font-size: 0.9rem; " +
      "margin: 1rem 0; " +
      "border-radius: 8px;";
    // Exibe antes do form
    const main = document.querySelector("main.container") || document.body;
    main.prepend(msg);
    // Oculta áreas de anúncio
    document
      .querySelectorAll("#ad-top, #ad-sidebar, .ad-in-table")
      .forEach((el) => {
        el.style.display = "none";
      });
  }

  // Referências ao DOM
  const form = document.getElementById("calc-form");
  const btnCalcular = document.getElementById("btnCalcular");
  const resultSection = document.getElementById("result-section");
  const resultTableBody = document.querySelector("#result-table tbody");
  const yearSpan = document.getElementById("year");
  const btnExportCSV = document.getElementById("btnExportCSV");
  const btnPrint = document.getElementById("btnPrint");
  const btnLimpar = document.getElementById("btnLimpar");

  // Desabilita o botão até o INCC ser carregado
  btnCalcular.disabled = true;
  btnCalcular.textContent = "Carregando INCC...";

  // Carrega dados de INCC via tabela externa
  let inccData = {};
  try {
    inccData = await fetchInccFromTabela();
    console.log("INCC carregado:", inccData);
  } catch (err) {
    console.error("Falha ao carregar INCC:", err);
    alert(
      "Não foi possível carregar dados do INCC. A aplicação continuará, mas sem ajustes."
    );
  } finally {
    btnCalcular.disabled = false;
    btnCalcular.textContent = "Calcular";
  }

  // Insere ano atual no rodapé
  yearSpan.textContent = new Date().getFullYear();

  let lastResults = []; // guarda resultados para CSV

  // Listeners
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (btnCalcular.disabled) {
      alert("Aguarde, dados do INCC ainda estão sendo carregados.");
      return;
    }
    calcular();
  });

  btnExportCSV.addEventListener("click", () => {
    if (!lastResults.length) return;
    const csv = toCSV(lastResults);
    downloadFile(csv, "parcelas_incc.csv");
  });

  btnPrint.addEventListener("click", () => window.print());

  btnLimpar.addEventListener("click", () => {
    form.reset();
    resultSection.classList.add("hidden");
    resultTableBody.innerHTML = "";
    lastResults = [];
  });

  // Função de cálculo
  function calcular() {
    const valorTotal = parseFloat(form.valorTotal.value || 0);
    const entrada = parseFloat(form.entrada.value || 0);
    const parcelas = parseInt(form.parcelas.value, 10);
    const dataInicio = form.dataInicio.value; // AAAA-MM
    const moeda = form.moeda.value;
    const modoExibicao = form.modoExibicao.value;

    if (isNaN(valorTotal) || isNaN(parcelas) || !dataInicio) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    const baseTotal = valorTotal - (entrada || 0);
    if (baseTotal <= 0) {
      alert("Valor total - entrada deve ser maior que 0.");
      return;
    }

    const valorBaseParcela = baseTotal / parcelas;
    const mesesPagamento = generateMonths(dataInicio, parcelas);

    // Monta array de resultados
    lastResults = mesesPagamento.map((mesPag, idx) => {
      const mesRef = addMonths(mesPag, -2); // cálculo M-2
      const inccPercent =
        typeof inccData[mesRef] === "number" ? inccData[mesRef] : null;

      const valorAjustado =
        inccPercent != null
          ? valorBaseParcela * (1 + inccPercent)
          : valorBaseParcela;

      return {
        parcela: idx + 1,
        mesPagamento: mesPag,
        valorBase: valorBaseParcela,
        inccM2: inccPercent,
        valorAjustado: valorAjustado,
      };
    });

    renderTable(lastResults, moeda, modoExibicao);
    resultSection.classList.remove("hidden");
  }

  // Função de renderização da tabela
  function renderTable(rows, currency, mode) {
    resultTableBody.innerHTML = "";

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      // # Parcela
      const tdParcela = document.createElement("td");
      tdParcela.textContent = row.parcela;
      tr.appendChild(tdParcela);

      // Mês Pagamento
      const tdMes = document.createElement("td");
      tdMes.textContent = row.mesPagamento;
      tr.appendChild(tdMes);

      if (mode === "detalhado") {
        // Valor Base
        const tdBase = document.createElement("td");
        tdBase.textContent = formatCurrency(row.valorBase, currency);
        tr.appendChild(tdBase);

        // INCC Ref (M-2)
        const tdIncc = document.createElement("td");
        tdIncc.textContent =
          row.inccM2 != null ? (row.inccM2 * 100).toFixed(2) + "%" : "--";
        tr.appendChild(tdIncc);
      } else {
        // Modo resumo
        const tdBaseResumo = document.createElement("td");
        tdBaseResumo.textContent = formatCurrency(row.valorBase, currency);
        tdBaseResumo.colSpan = 2;
        tr.appendChild(tdBaseResumo);
      }

      // Valor Ajustado
      const tdAjustado = document.createElement("td");
      tdAjustado.textContent = formatCurrency(row.valorAjustado, currency);
      tr.appendChild(tdAjustado);

      resultTableBody.appendChild(tr);
    });
  }
})();
