# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify, send_from_directory
import json
import telebot
import os
from datetime import datetime

TOKEN = "8390334757:AAGZ0iTQMW90-eZLvsQsYheB_mtEoimeq3w"
LOG_CHANNEL_ID = -1003718026703

bot = telebot.TeleBot(TOKEN, parse_mode="HTML")
app = Flask(__name__)
DB_FILE = "db.json"
MINIAPP_FOLDER = "miniapp"

def load_db():
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
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
    user = db.get(str(user_id), {})
    return jsonify({
        "status": user.get("status", "none"),
        "registered_at": user.get("registered_at"),
        "deposit_amount": user.get("deposit_amount"),
        "deposit_at": user.get("deposit_at"),
        "trader_id": user.get("trader_id"),
        "country": user.get("country")
    })

@app.route("/bind_id", methods=["POST"])
def bind_id():
    data = request.get_json() or {}
    telegram_id = str(data.get("telegram_id"))
    trader_id = str(data.get("trader_id", "")).strip()
    if not telegram_id or not trader_id:
        return jsonify({"status": "none"})
    db = load_db()
    found_user_id = None
    found_user = None
    for user_id, user in db.items():
        if str(user.get("trader_id", "")).strip() == trader_id:
            found_user_id = user_id
            found_user = user
            break
    if not found_user:
        return jsonify({"status": "none"})
    if found_user_id != telegram_id:
        return jsonify({"status": "blocked"})
    return jsonify({"status": found_user.get("status", "none"), "telegram_id": found_user_id})

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
    except Exception:
        amount = 0.0
    if not user_id:
        return "Missing subid", 400
    db = load_db()
    user = db.get(str(user_id), {})
    if status == "lead":
        user["status"] = "registered"
        user["registered_at"] = event_time or now_str
        user["trader_id"] = trader_id
        user["country"] = country
        db[str(user_id)] = user
        save_db(db)
        return "OK"
    elif status == "deposit":
        user["status"] = "approved"
        user["deposit_amount"] = amount
        user["deposit_at"] = event_time or now_str
        user["trader_id"] = trader_id
        user["country"] = country
        db[str(user_id)] = user
        save_db(db)
        return "OK"
    elif status == "sundep":
        user["trader_id"] = trader_id
        user["country"] = country
        user["last_repeat_deposit"] = amount
        db[str(user_id)] = user
        save_db(db)
        return "OK"
    return "Unknown status", 400

@app.route("/history/<user_id>", methods=["GET"])
def get_history(user_id):
    db = load_db()
    return jsonify(db.get(str(user_id), {}).get("history", []))

@app.route("/save_signal", methods=["POST"])
def save_signal():
    data = request.get_json() or {}
    user_id = str(data.get("user_id"))
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    db = load_db()
    user = db.get(user_id, {})
    history = user.get("history", [])
    signal_id = str(int(datetime.now().timestamp() * 1000))
    history.insert(0, {
        "id": signal_id,
        "market": data.get("market"),
        "pair": data.get("pair"),
        "time": data.get("time"),
        "direction": data.get("direction"),
        "analysis": data.get("analysis"),
        "result": "PENDING",
        "expires_at": data.get("expires_at"),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    user["history"] = history[:100]
    db[user_id] = user
    save_db(db)
    return jsonify({"ok": True, "signal_id": signal_id})

@app.route("/update_result", methods=["POST"])
def update_result():
    data = request.get_json() or {}
    user_id = str(data.get("user_id"))
    signal_id = str(data.get("signal_id"))
    result = data.get("result")
    db = load_db()
    user = db.get(user_id, {})
    history = user.get("history", [])
    for item in history:
        if str(item.get("id")) == signal_id:
            item["result"] = result
            item["finished_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            break
    user["history"] = history
    db[user_id] = user
    save_db(db)
    return jsonify({"ok": True})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
