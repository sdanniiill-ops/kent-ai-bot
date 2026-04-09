const FOREX_PAIRS = [
  "EUR/USD","EUR/CAD","CAD/CHF","EUR/JPY","USD/JPY",
  "GBP/USD","AUD/USD","USD/CHF","NZD/USD","GBP/JPY"
];
const OTS_PAIRS = [
  "EUR/USD OTC","EUR/CAD OTC","AUD/CAD OTC","AUD/CHF OTC","USD/CAD OTC",
  "GBP/USD OTC","EUR/JPY OTC","USD/JPY OTC","NZD/USD OTC","GBP/JPY OTC"
];
const FOREX_TIMES = [{ label:"1 мин", seconds:60 },{ label:"3 мин", seconds:180 },{ label:"5 мин", seconds:300 },{ label:"10 мин", seconds:600 }];
const OTS_TIMES = [{ label:"5 сек", seconds:5 },{ label:"30 сек", seconds:30 },{ label:"1 мин", seconds:60 },{ label:"3 мин", seconds:180 },{ label:"5 мин", seconds:300 },{ label:"10 мин", seconds:600 }];

const params = new URLSearchParams(window.location.search);
const userId = params.get("user_id");

const marketType = document.getElementById("marketType");
const pairSelect = document.getElementById("pair");
const timeframeSelect = document.getElementById("timeframe");
const getSignalBtn = document.getElementById("getSignalBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const resetBtn = document.getElementById("resetBtn");
const mainMenu = document.getElementById("mainMenu");
const searchScreen = document.getElementById("searchScreen");
const signalScreen = document.getElementById("signalScreen");
const closedCard = document.getElementById("closedCard");
const analysisLoader = document.getElementById("analysisLoader");
const loaderFill = document.getElementById("loaderFill");
const analysisCard = document.getElementById("analysisCard");
const analysisContent = document.getElementById("analysisContent");
const resultPair = document.getElementById("resultPair");
const resultTime = document.getElementById("resultTime");
const resultMarket = document.getElementById("resultMarket");
const resultDirection = document.getElementById("resultDirection");
const resultAnalysis = document.getElementById("resultAnalysis");
const countdownText = document.getElementById("countdownText");
const progressLine = document.getElementById("progressLine");
const resultBadge = document.getElementById("resultBadge");
const historyList = document.getElementById("historyList");
const tvWrap = document.getElementById("tvWrap");
const tvFrame = document.getElementById("tvFrame");
let currentTimer = null;
let currentSignalId = null;
let lastAnalysis = null;

function isMarketClosedNow() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day === 0 || day === 6 || hour < 8 || hour >= 22;
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
    fillSelect(pairSelect, OTS_PAIRS, (x) => ({ value:x, label:x }));
    fillSelect(timeframeSelect, OTS_TIMES, (x) => ({ value:String(x.seconds), label:x.label }));
  } else {
    fillSelect(pairSelect, FOREX_PAIRS, (x) => ({ value:x, label:x }));
    fillSelect(timeframeSelect, FOREX_TIMES, (x) => ({ value:String(x.seconds), label:x.label }));
  }
  lastAnalysis = null;
  analysisCard.classList.add("hidden");
}
function secondsToLabel(seconds) {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds % 60 === 0) return `${seconds/60} мин`;
  return `${seconds} сек`;
}
function formatMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function randomDirection() { return Math.random() > 0.5 ? "Вверх" : "Вниз"; }
function updateDirectionStyle(direction) {
  resultDirection.className = "direction-value";
  resultDirection.classList.add(direction === "Вверх" ? "direction-up" : "direction-down");
}
function mapTradingViewSymbol(pair) { return "FX:" + pair.replace("/", ""); }
function loadTradingView(pair) {
  const symbol = mapTradingViewSymbol(pair);
  tvFrame.src = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=1&hidesidetoolbar=1&symboledit=1&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1`;
  tvWrap.classList.remove("hidden");
}
function generateForexAnalysis(pair, seconds) {
  const direction = randomDirection();
  const reasonsUp = ["MACD показывает восходящий импульс","EMA 9 выше EMA 21 — локальный тренд вверх","RSI держится выше нейтральной зоны","Цена удерживается выше ближайшего уровня"];
  const reasonsDown = ["MACD показывает нисходящий импульс","EMA 9 ниже EMA 21 — локальный тренд вниз","RSI слабеет ниже нейтральной зоны","Цена удерживается под ближайшим уровнем"];
  const pick = direction === "Вверх" ? reasonsUp : reasonsDown;
  return {direction, text:`Пара: ${pair}\nВремя: ${secondsToLabel(seconds)}\nНаправление: ${direction}\n\nПричины входа:\n• ${pick[0]}\n• ${pick[1]}\n• ${pick[2]}`};
}
function generateOtsAnalysis(pair, seconds) {
  const direction = randomDirection();
  const reasons = direction === "Вверх" ? ["Импульс после боковика","Локальный уровень удержан","Серия свечей поддерживает вход вверх"] : ["Откат от уровня","Ослабление импульса","Локальная серия свечей поддерживает вход вниз"];
  return {direction, text:`Пара: ${pair}\nВремя: ${secondsToLabel(seconds)}\nНаправление: ${direction}\n\nАнализ:\n• ${reasons[0]}\n• ${reasons[1]}\n• ${reasons[2]}`};
}
async function runAnalysis() {
  if (isMarketClosedNow()) { renderMarketClosedState(); return; }
  analysisCard.classList.add("hidden");
  analysisLoader.classList.remove("hidden");
  loaderFill.style.width = "0%";
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    loaderFill.style.width = `${Math.min(progress, 100)}%`;
  }, 180);
  await new Promise(resolve => setTimeout(resolve, 2000));
  clearInterval(interval);
  loaderFill.style.width = "100%";
  const market = marketType.value;
  const pair = pairSelect.value;
  const seconds = Number(timeframeSelect.value);
  const analysis = market === "Forex" ? generateForexAnalysis(pair, seconds) : generateOtsAnalysis(pair, seconds);
  lastAnalysis = analysis;
  analysisContent.textContent = analysis.text;
  analysisLoader.classList.add("hidden");
  analysisCard.classList.remove("hidden");
}
async function saveSignal(market, pair, seconds, direction, expiresAt, analysis) {
  if (!userId) return null;
  const res = await fetch("/save_signal", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({user_id:userId, market, pair, time:secondsToLabel(seconds), direction, expires_at:expiresAt, analysis})
  });
  const data = await res.json();
  return data.signal_id || null;
}
async function updateResult(signalId, result) {
  if (!userId || !signalId) return;
  await fetch("/update_result", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({user_id:userId, signal_id:signalId, result})
  });
}
async function loadHistory() {
  if (!userId) return;
  const res = await fetch(`/history/${userId}`);
  const history = await res.json();
  historyList.innerHTML = "";
  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    let badge = "В работе";
    if (item.result === "WIN") badge = "WIN";
    if (item.result === "LOSS") badge = "LOSS";
    div.innerHTML = `<div><strong>${item.pair}</strong></div><div>${item.market || ""} • ${item.time} • ${item.direction}</div><div><strong>${badge}</strong></div>`;
    historyList.appendChild(div);
  });
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
  if (currentTimer) clearInterval(currentTimer);
  currentTimer = null;
  currentSignalId = null;
  resultBadge.textContent = "В работе";
  resultBadge.className = "result-badge pending";
  progressLine.style.width = "100%";
  countdownText.textContent = "00:00";
  tvWrap.classList.add("hidden");
  tvFrame.src = "";
  signalScreen.classList.add("hidden");
  searchScreen.classList.add("hidden");
  renderMarketClosedState();
}
async function buildSignal() {
  if (isMarketClosedNow()) { renderMarketClosedState(); return; }
  const market = marketType.value;
  const pair = pairSelect.value;
  const seconds = Number(timeframeSelect.value);
  const analysis = lastAnalysis || (market === "Forex" ? generateForexAnalysis(pair, seconds) : generateOtsAnalysis(pair, seconds));
  showSearch();
  setTimeout(async () => {
    const direction = analysis.direction;
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const hh = String(expiresAt.getHours()).padStart(2, "0");
    const mm = String(expiresAt.getMinutes()).padStart(2, "0");
    const ss = String(expiresAt.getSeconds()).padStart(2, "0");
    const expiryText = seconds < 60 ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
    resultPair.textContent = pair;
    resultTime.textContent = secondsToLabel(seconds);
    resultMarket.textContent = market;
    resultDirection.textContent = direction;
    resultAnalysis.textContent = analysis.text;
    updateDirectionStyle(direction);
    resultBadge.textContent = "В работе";
    resultBadge.className = "result-badge pending";
    showSignalScreen();
    if (market === "Forex") loadTradingView(pair); else { tvWrap.classList.add("hidden"); tvFrame.src = ""; }
    currentSignalId = await saveSignal(market, pair, seconds, direction, expiryText, analysis.text);
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
        if (result === "LOSS" && market === "Forex") {
          resultBadge.textContent = "LOSS • Перекрытие x2";
          resultBadge.className = "result-badge loss";
        } else {
          resultBadge.textContent = result;
          resultBadge.className = `result-badge ${result === "WIN" ? "win" : "loss"}`;
        }
        await updateResult(currentSignalId, result);
        await loadHistory();
      }
    }, 1000);
  }, 5000);
}
function init() {
  fillSelect(marketType, ["Forex","OTC"], (x)=>({value:x,label:x}));
  refreshMarketOptions();
  renderMarketClosedState();
  loadHistory();
  marketType.addEventListener("change", refreshMarketOptions);
  timeframeSelect.addEventListener("change", ()=>{lastAnalysis=null; analysisCard.classList.add("hidden");});
  pairSelect.addEventListener("change", ()=>{lastAnalysis=null; analysisCard.classList.add("hidden");});
  analyzeBtn.addEventListener("click", runAnalysis);
  getSignalBtn.addEventListener("click", buildSignal);
  resetBtn.addEventListener("click", backToMainMenu);
  setInterval(renderMarketClosedState, 30000);
}
init();
