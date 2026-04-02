const FOREX_PAIRS = [
  "EUR/USD","EUR/CAD","CAD/CHF","EUR/JPY","USD/JPY",
  "GBP/USD","AUD/USD","USD/CHF","NZD/USD","GBP/JPY"
];

const OTS_PAIRS = [
  "EUR/USD OTC","EUR/CAD OTC","AUD/CAD OTC","AUD/CHF OTC","USD/CAD OTC",
  "GBP/USD OTC","EUR/JPY OTC","USD/JPY OTC","NZD/USD OTC","GBP/JPY OTC"
];

const FOREX_TIMES = [
  { label: "1 мин", seconds: 60 },
  { label: "3 мин", seconds: 180 },
  { label: "5 мин", seconds: 300 },
  { label: "10 мин", seconds: 600 }
];

const OTS_TIMES = [
  { label: "5 сек", seconds: 5 },
  { label: "30 сек", seconds: 30 },
  { label: "1 мин", seconds: 60 },
  { label: "3 мин", seconds: 180 },
  { label: "5 мин", seconds: 300 },
  { label: "10 мин", seconds: 600 }
];

const params = new URLSearchParams(window.location.search);
const userId = params.get("user_id");

const marketType = document.getElementById("marketType");
const pairSelect = document.getElementById("pair");
const timeframeSelect = document.getElementById("timeframe");
const getSignalBtn = document.getElementById("getSignalBtn");
const resetBtn = document.getElementById("resetBtn");

const mainMenu = document.getElementById("mainMenu");
const searchScreen = document.getElementById("searchScreen");
const signalScreen = document.getElementById("signalScreen");
const closedCard = document.getElementById("closedCard");

const resultPair = document.getElementById("resultPair");
const resultTime = document.getElementById("resultTime");
const resultMarket = document.getElementById("resultMarket");
const resultDirection = document.getElementById("resultDirection");
const countdownText = document.getElementById("countdownText");
const progressLine = document.getElementById("progressLine");
const resultBadge = document.getElementById("resultBadge");
const historyList = document.getElementById("historyList");

let currentTimer = null;
let currentSignalId = null;

function isMarketClosedNow() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6) return true;
  if (hour < 8 || hour >= 22) return true;
  return false;
}

function renderMarketClosedState() {
  if (isMarketClosedNow()) {
    closedCard.classList.remove("hidden");
    mainMenu.classList.add("hidden");
    searchScreen.classList.add("hidden");
    signalScreen.classList.add("hidden");
  } else {
    closedCard.classList.add("hidden");
    mainMenu.classList.remove("hidden");
  }
}

function fillSelect(select, values, mapper) {
  select.innerHTML = "";
  values.forEach((item) => {
    const option = document.createElement("option");
    const mapped = mapper(item);
    option.value = mapped.value;
    option.textContent = mapped.label;
    select.appendChild(option);
  });
}

function refreshMarketOptions() {
  const market = marketType.value;
  if (market === "OTC") {
    fillSelect(pairSelect, OTS_PAIRS, (x) => ({ value: x, label: x }));
    fillSelect(timeframeSelect, OTS_TIMES, (x) => ({ value: String(x.seconds), label: x.label }));
  } else {
    fillSelect(pairSelect, FOREX_PAIRS, (x) => ({ value: x, label: x }));
    fillSelect(timeframeSelect, FOREX_TIMES, (x) => ({ value: String(x.seconds), label: x.label }));
  }
}

function secondsToLabel(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds % 60 === 0) return `${seconds / 60} мин`;
  return `${seconds} сек`;
}

function formatMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function showSearch() {
  mainMenu.classList.add("hidden");
  signalScreen.classList.add("hidden");
  searchScreen.classList.remove("hidden");
}

function showSignalScreen() {
  searchScreen.classList.add("hidden");
  signalScreen.classList.remove("hidden");
}

function backToMainMenu() {
  if (currentTimer) {
    clearInterval(currentTimer);
    currentTimer = null;
  }
  currentSignalId = null;
  resultBadge.textContent = "В работе";
  resultBadge.className = "result-badge pending";
  progressLine.style.width = "100%";
  countdownText.textContent = "00:00";
  signalScreen.classList.add("hidden");
  searchScreen.classList.add("hidden");
  renderMarketClosedState();
}

function randomDirection() {
  return Math.random() > 0.5 ? "Вверх" : "Вниз";
}

function updateDirectionStyle(direction) {
  resultDirection.className = "direction-value";
  resultDirection.classList.add(direction === "Вверх" ? "direction-up" : "direction-down");
}

async function saveSignal(market, pair, seconds, direction, expiresAt) {
  if (!userId) return null;
  try {
    const res = await fetch("/save_signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        market: market,
        pair: pair,
        time: secondsToLabel(seconds),
        direction: direction,
        expires_at: expiresAt
      })
    });
    const data = await res.json();
    return data.signal_id || null;
  } catch (e) {
    console.log("Ошибка сохранения сигнала", e);
    return null;
  }
}

async function updateResult(signalId, result) {
  if (!userId || !signalId) return;
  try {
    await fetch("/update_result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        signal_id: signalId,
        result: result
      })
    });
  } catch (e) {
    console.log("Ошибка обновления результата", e);
  }
}

async function loadHistory() {
  if (!userId) return;
  try {
    const res = await fetch(`/history/${userId}`);
    const history = await res.json();
    historyList.innerHTML = "";

    history.forEach(item => {
      const div = document.createElement("div");
      div.className = "history-item";
      let badge = "В работе";
      if (item.result === "WIN") badge = "WIN";
      if (item.result === "LOSS") badge = "LOSS";
      div.innerHTML = `<div><strong>${item.pair}</strong></div>
      <div>${item.market || ""} • ${item.time} • ${item.direction}</div>
      <div><strong>${badge}</strong></div>`;
      historyList.appendChild(div);
    });
  } catch (e) {
    console.log("Ошибка загрузки истории", e);
  }
}

async function buildSignal() {
  if (isMarketClosedNow()) {
    renderMarketClosedState();
    return;
  }

  showSearch();

  setTimeout(async () => {
    const market = marketType.value;
    const pair = pairSelect.value;
    const seconds = Number(timeframeSelect.value);
    const direction = randomDirection();

    const expiresAt = new Date(Date.now() + seconds * 1000);
    const hh = String(expiresAt.getHours()).padStart(2, "0");
    const mm = String(expiresAt.getMinutes()).padStart(2, "0");
    const ss = String(expiresAt.getSeconds()).padStart(2, "0");
    const expiryText = seconds < 60 ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;

    resultPair.textContent = pair;
    resultTime.textContent = secondsToLabel(seconds);
    resultMarket.textContent = market;
    resultDirection.textContent = direction;
    updateDirectionStyle(direction);
    resultBadge.textContent = "В работе";
    resultBadge.className = "result-badge pending";

    showSignalScreen();

    currentSignalId = await saveSignal(market, pair, seconds, direction, expiryText);

    let remaining = seconds;
    progressLine.style.width = "100%";
    countdownText.textContent = formatMMSS(remaining);

    if (currentTimer) clearInterval(currentTimer);

    currentTimer = setInterval(async () => {
      remaining -= 1;
      const percent = Math.max(0, (remaining / seconds) * 100);
      progressLine.style.width = `${percent}%`;
      countdownText.textContent = formatMMSS(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearInterval(currentTimer);
        currentTimer = null;

        const result = Math.random() < 0.7 ? "WIN" : "LOSS";
        resultBadge.textContent = result;
        resultBadge.className = `result-badge ${result === "WIN" ? "win" : "loss"}`;

        await updateResult(currentSignalId, result);
        await loadHistory();
      }
    }, 1000);
  }, 5000);
}

function init() {
  fillSelect(marketType, ["Forex", "OTC"], (x) => ({ value: x, label: x }));
  refreshMarketOptions();
  renderMarketClosedState();
  loadHistory();

  marketType.addEventListener("change", refreshMarketOptions);
  getSignalBtn.addEventListener("click", buildSignal);
  resetBtn.addEventListener("click", backToMainMenu);

  setInterval(renderMarketClosedState, 30000);
}

init();
