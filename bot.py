# -*- coding: utf-8 -*-
import telebot
import requests
from telebot.types import *

TOKEN = "PASTE_BOT_TOKEN"
DOMAIN = "https://YOUR_DOMAIN"

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def start(message):
    markup = InlineKeyboardMarkup()

    markup.add(InlineKeyboardButton(
        "🚀 Регистрация",
        url=f"https://partners.pocketoption.com/?subid={message.chat.id}"
    ))

    markup.add(InlineKeyboardButton(
        "✅ Проверить доступ",
        callback_data="check"
    ))

    markup.add(InlineKeyboardButton(
        "📊 Открыть сигналы",
        web_app=WebAppInfo(url=f"{DOMAIN}/miniapp")
    ))

    bot.send_message(message.chat.id,
"""🤖 AI BOT 89%

📊 Умные сигналы на основе AI

1. Зарегистрируйся
2. Сделай депозит
3. Нажми проверить доступ
""", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: True)
def callback(call):
    if call.data == "check":
        r = requests.get(f"{DOMAIN}/check/{call.message.chat.id}").json()

        if r["status"] == "approved":
            bot.send_message(call.message.chat.id, "✅ Доступ открыт")
        else:
            bot.send_message(call.message.chat.id, "❌ Нет доступа")

bot.polling()
