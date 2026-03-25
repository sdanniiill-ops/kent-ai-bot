# -*- coding: utf-8 -*-
import telebot
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

TOKEN = "ТВОЙ_ТОКЕН"
DOMAIN = "https://kent-ai-bot.onrender.com"

# Твоя ссылка регистрации
REGISTER_URL = (
    "https://u3.shortink.io/register"
    "?utm_campaign=840644"
    "&utm_source=affiliate"
    "&utm_medium=sr"
    "&a=gaQWS5fftwSPOE"
    "&ac=89kent"
    "&code=WELCOME50"
)

bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def start(message):
    markup = InlineKeyboardMarkup()

    markup.add(InlineKeyboardButton(
        "🚀 Регистрация",
        url=f"{REGISTER_URL}&subid={message.chat.id}"
    ))

    markup.add(InlineKeyboardButton(
        "✅ Проверить доступ",
        callback_data="check"
    ))

    markup.add(InlineKeyboardButton(
        "📊 Открыть сигналы",
        callback_data="open_signals"
    ))

    bot.send_message(
        message.chat.id,
        """🤖 AI BOT 89%

📊 Умные сигналы на основе AI

1. Зарегистрируйся
2. Сделай депозит
3. Нажми "Проверить доступ"
""",
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: True)
def callback(call):
    user_id = str(call.message.chat.id)

    if call.data == "check":
        r = requests.get(f"{DOMAIN}/check/{user_id}", timeout=10).json()

        if r["status"] == "approved":
            bot.send_message(call.message.chat.id, "✅ Доступ открыт")
        elif r["status"] == "registered":
            bot.send_message(call.message.chat.id, "📝 Регистрация найдена, депозит ещё не найден")
        else:
            bot.send_message(call.message.chat.id, "❌ Нет доступа")

    elif call.data == "open_signals":
        r = requests.get(f"{DOMAIN}/check/{user_id}", timeout=10).json()

        if r["status"] == "approved":
            markup = InlineKeyboardMarkup()
            markup.add(InlineKeyboardButton(
                "📊 Открыть Mini App",
                web_app=WebAppInfo(url=f"{DOMAIN}/miniapp?user_id={user_id}")
            ))
            bot.send_message(call.message.chat.id, "✅ Доступ к сигналам открыт", reply_markup=markup)
        else:
            bot.send_message(call.message.chat.id, "❌ Сначала регистрация и депозит")

bot.infinity_polling()
