# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify, send_from_directory
import json
import telebot
import os
from datetime import datetime

TOKEN = "ТВОЙ_ТОКЕН"
LOG_CHANNEL_ID = -1003718026703   # сюда ID лог-канала

bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)

DB_FILE = "db.json"
MINIAPP_FOLDER = "miniapp"

def load_db():
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_db(db):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

@app.route("/")
def home():
    return "Server is running"

@app.route("/miniapp")
def miniapp():
    return send_from_directory(MINIAPP_FOLDER, "index.html")

@app.route("/miniapp/<path:filename>")
def miniapp_files(filename):
    return send_from_directory(MINIAPP_FOLDER, filename)

@app.route("/check/<user_id>")
def check(user_id):
    db = load_db()
    user = db.get(user_id, {})
    return jsonify({
        "status": user.get("status", "none"),
        "registered_at": user.get("registered_at"),
        "deposit_amount": user.get("deposit_amount"),
        "deposit_at": user.get("deposit_at"),
        "trader_id": user.get("trader_id"),
        "country": user.get("country")
    })

@app.route("/postback")
def postback():
    user_id = request.args.get("subid")
    status = request.args.get("status", "").lower()
    trader_id = request.args.get("trader_id", "")
    country = request.args.get("country", "")
    event_time = request.args.get("time", "")
    amount_raw = request.args.get("amount", "0")

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        amount = float(str(amount_raw).replace(",", "."))
    except:
        amount = 0.0

    if not user_id:
        return "Missing subid", 400

    db = load_db()
    user = db.get(user_id, {})

    if status == "lead":
        user["status"] = "registered"
        user["registered_at"] = event_time or now_str
        user["trader_id"] = trader_id
        user["country"] = country
        db[user_id] = user
        save_db(db)

        bot.send_message(
            LOG_CHANNEL_ID,
            f"📝 Новая регистрация\n\n"
            f"Telegram ID: {user_id}\n"
            f"Trader ID: {trader_id}\n"
            f"Страна: {country}\n"
            f"Время: {event_time or now_str}"
        )
        return "OK"

    elif status == "deposit":
        user["status"] = "approved"
        user["deposit_amount"] = amount
        user["deposit_at"] = event_time or now_str
        user["trader_id"] = trader_id
        user["country"] = country
        db[user_id] = user
        save_db(db)

        bot.send_message(
            LOG_CHANNEL_ID,
            f"💰 Первый депозит\n\n"
            f"Telegram ID: {user_id}\n"
            f"Trader ID: {trader_id}\n"
            f"Сумма: {amount}$\n"
            f"Страна: {country}\n"
            f"Время: {event_time or now_str}\n\n"
            f"✅ Доступ открыт"
        )
        return "OK"

    elif status == "sundep":
        user["trader_id"] = trader_id
        user["country"] = country
        db[user_id] = user
        save_db(db)

        bot.send_message(
            LOG_CHANNEL_ID,
            f"🔁 Повторный депозит\n\n"
            f"Telegram ID: {user_id}\n"
            f"Trader ID: {trader_id}\n"
            f"Сумма: {amount}$\n"
            f"Страна: {country}\n"
            f"Время: {event_time or now_str}"
        )
        return "OK"

    return "Unknown status", 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
