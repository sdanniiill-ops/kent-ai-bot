function getSignal(){

    let hour = new Date().getHours();

    if(hour >= 23){
        document.getElementById("signal").innerText = "❌ Ринок закритий";
        return;
    }

    document.getElementById("signal").innerText = "⏳ Аналіз ринку...";

    setTimeout(() => {

        let pair = document.getElementById("pair").value;
        let time = document.getElementById("time").value;

        let direction = Math.random() > 0.5 ? "📈 Вверх ⬆️" : "📉 Вниз ⬇️";

        document.getElementById("signal").innerText =
`📊 AI СИГНАЛ

💱 ${pair}
${direction}
⏱ ${time}

🤖 KENT 89% AI`;

    }, 2000);
}
