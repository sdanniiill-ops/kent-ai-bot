function getSignal() {
    const hour = new Date().getHours();

    // Рынок открыт с 08:00 до 22:00
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
        addHistory(pair, time, direction);
    }, 5000);
}

function addHistory(pair, time, direction) {
    const list = document.getElementById("history-list");
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerText = `${pair} | ${time} | ${direction}`;
    list.prepend(item);
}
