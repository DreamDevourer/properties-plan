// Utilidades genéricas: formato de moeda, datas, CSV, etc.

const currencyFormatters = {
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  EUR: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
};

export function formatCurrency(value, currency = "BRL") {
  const fmt = currencyFormatters[currency] || currencyFormatters.BRL;
  return fmt.format(value);
}

/**
 * Adiciona meses a uma string YYYY-MM, retorna também no formato YYYY-MM
 */
export function addMonths(yyyyMm, monthsToAdd) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const date = new Date(y, m - 1 + monthsToAdd, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Gera um array [start, start+1, ..., start+(n-1)] em formato YYYY-MM
 */
export function generateMonths(startYYYYMM, count) {
  return Array.from({ length: count }, (_, i) => addMonths(startYYYYMM, i));
}

/**
 * Gera CSV de um array de objetos.
 */
export function toCSV(dataArr, delimiter = ";") {
  if (!dataArr.length) return "";
  const headers = Object.keys(dataArr[0]);
  const rows = dataArr.map((obj) => headers.map((h) => obj[h]).join(delimiter));
  return [headers.join(delimiter), ...rows].join("\n");
}

/**
 * Força download de string como arquivo.
 */
export function downloadFile(
  content,
  filename,
  mime = "text/csv;charset=utf-8;"
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

/**
 * Tenta buscar a página via uma lista de proxies CORS-friendly.
 * Se todos falharem, lança erro.
 */
export async function fetchInccFromTabela() {
  const target = "https://www.dadosdemercado.com.br/indices/incc-m";
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://cors.bridged.cc/",
    "https://api.codetabs.com/v1/proxy?quest=",
  ];

  let html = null;
  for (const proxy of proxies) {
    try {
      const resp = await fetch(proxy + encodeURIComponent(target));
      if (resp.ok) {
        html = await resp.text();
        console.log(`INCC carregado via proxy: ${proxy}`);
        break;
      }
      console.warn(`Proxy ${proxy} retornou status ${resp.status}`);
    } catch (err) {
      console.warn(`Falha no proxy ${proxy}:`, err.message);
    }
  }

  if (!html) {
    throw new Error("Não foi possível carregar INCC via nenhum proxy.");
  }

  // --- parsing HTML em Document ---
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = doc.querySelectorAll(".table-container.high tbody tr");
  const MES_MAP = {
    Jan: "01",
    Fev: "02",
    Mar: "03",
    Abr: "04",
    Mai: "05",
    Jun: "06",
    Jul: "07",
    Ago: "08",
    Set: "09",
    Out: "10",
    Nov: "11",
    Dez: "12",
  };

  const data = {};
  rows.forEach((tr) => {
    const [monAbbrev, year] = tr.children[0].textContent.trim().split("/");
    const key = `${year}-${MES_MAP[monAbbrev]}`;
    const percentual =
      parseFloat(tr.children[1].textContent.replace(",", ".")) / 100;
    data[key] = percentual;
  });

  return data;
}
