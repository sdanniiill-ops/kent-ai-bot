# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
import json
import telebot

TOKEN = "8390334757:AAGZ0iTQMW90-eZLvsQsYheB_mtEoimeq3w"
GROUP_ID = -1003810263177

bot = telebot.TeleBot(TOKEN)
app = Flask(__name__)

DB_FILE = "db.json"

def load_db():
    try:
        with open(DB_FILE) as f:
            return json.load(f)
    except:
        return {}

def save_db(db):
    with open(DB_FILE, "w") as f:
        json.dump(db, f)

@app.route("/postback")
def postback():
    user_id = request.args.get("subid")
    status = request.args.get("status")

    db = load_db()

    if status == "lead":
    db[user_id] = "registered"
    bot.send_message(GROUP_ID, f"📝 {user_id} зарегистрировался")

elif status == "deposit":
    db[user_id] = "approved"
    bot.send_message(GROUP_ID, f"💰 {user_id} сделал депозит")

    save_db(db)
    return "OK"

@app.route("/check/<user_id>")
def check(user_id):
    db = load_db()
    return jsonify({"status": db.get(user_id, "none")})

app.run(host="0.0.0.0", port=5000)
