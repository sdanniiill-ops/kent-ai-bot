const params = new URLSearchParams(window.location.search);
const userId = params.get("user_id");

window.addEventListener("load", () => {
    loadHistory();
});

function getSignal() {
    const hour = new Date().getHours();

    if (hour < 8 || hour >= 22) {
        document.getElementById("signal").innerText =
`❌ Рынок закрыт

🕗 Время работы рынка: 08:00–22:00`;
        return;
    }

    document.getElementById("signal").innerText = "⏳ Поиск сигнала...";

    setTimeout(() => {
        const pair = document.getElementById("pair").value;
        const time = document.getElementById("time").value;
        const direction = Math.random() > 0.5 ? "📈 Вверх ⬆️" : "📉 Вниз ⬇️";

        const signalText =
`📊 AI СИГНАЛ

💱 Пара: ${pair}
${direction}
⏱ Время входа: ${time}

🤖 KENT 89% AI`;

        document.getElementById("signal").innerText = signalText;

        addHistoryItem({
            pair,
            time,
            direction
        });

        saveSignal(pair, time, direction);
    }, 5000);
}

function addHistoryItem(item) {
    const list = document.getElementById("history-list");
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerText = `${item.pair} | ${item.time} | ${item.direction}`;
    list.prepend(div);
}

async function saveSignal(pair, time, direction) {
    if (!userId) return;

    try {
        await fetch("/save_signal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                pair: pair,
                time: time,
                direction: direction
            })
        });
    } catch (e) {
        console.log("Ошибка сохранения истории", e);
    }
}

async function loadHistory() {
    if (!userId) return;

    try {
        const res = await fetch(`/history/${userId}`);
        const history = await res.json();

        const list = document.getElementById("history-list");
        list.innerHTML = "";

        history.forEach(item => {
            const div = document.createElement("div");
            div.className = "history-item";
            div.innerText = `${item.pair} | ${item.time} | ${item.direction}`;
            list.appendChild(div);
        });
    } catch (e) {
        console.log("Ошибка загрузки истории", e);
    }
}
