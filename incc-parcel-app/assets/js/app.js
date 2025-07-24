import {
  formatCurrency,
  generateMonths,
  toCSV,
  downloadFile,
  addMonths,
  fetchInccFromTabela,
} from "./utils.js";

(async function () {
  "use strict";

  // Referências ao DOM
  const form = document.getElementById("calc-form");
  const resultSection = document.getElementById("result-section");
  const resultTableBody = document.querySelector("#result-table tbody");
  const yearSpan = document.getElementById("year");
  const btnExportCSV = document.getElementById("btnExportCSV");
  const btnPrint = document.getElementById("btnPrint");
  const btnLimpar = document.getElementById("btnLimpar");

  // Carrega os dados de INCC da tabela externa
  let inccData = {};
  try {
    inccData = await fetchInccFromTabela();
    console.log("INCC carregado:", inccData);
  } catch (err) {
    console.error("Erro ao carregar INCC:", err);
    inccData = {};
  }

  // Define o ano atual no rodapé
  yearSpan.textContent = new Date().getFullYear();

  let lastResults = []; // guarda array de resultados para exportar

  // Listeners do formulário e botões
  form.addEventListener("submit", (e) => {
    e.preventDefault();
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

    // Validações básicas
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

      // Mês de Pagamento
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
        // Modo resumo: unifica colunas de valor base
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
