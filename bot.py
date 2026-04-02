# -*- coding: utf-8 -*-
import telebot
import requests
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

TOKEN = "8390334757:AAGZ0iTQMW90-eZLvsQsYheB_mtEoimeq3w"
DOMAIN = "https://kent-ai-bot.onrender.com"
REQUIRED_CHANNEL = -1003810263177

bot = telebot.TeleBot(TOKEN)

REGISTER_URL = (
    "https://u3.shortink.io/register"
    "?utm_campaign=840644"
    "&utm_source=affiliate"
    "&utm_medium=sr"
    "&a=gaQWS5fftwSPOE"
    "&ac=89kent"
    "&code=WELCOME50"
)

def is_subscribed(user_id):
    try:
        member = bot.get_chat_member(REQUIRED_CHANNEL, user_id)
        return member.status in ["member", "administrator", "creator"]
    except Exception:
        return False

def send_signal_button(chat_id):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(
        "📊 Открыть сигналы",
        web_app=WebAppInfo(url=f"{DOMAIN}/miniapp?user_id={chat_id}")
    ))
    bot.send_message(chat_id, "✅ Депозит найден. Доступ к сигналам открыт.", reply_markup=markup)

@bot.message_handler(commands=['start'])
def start(message):
    if not is_subscribed(message.chat.id):
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("📢 Подписаться", url="https://t.me/+jUfPvsXK3vUxZjMy"))
        markup.add(InlineKeyboardButton("✅ Я подписался", callback_data="check_sub"))
        bot.send_message(
            message.chat.id,
            "❌ Для доступа к боту сначала подпишись на основной канал.\n\nПосле подписки нажми кнопку «Я подписался».",
            reply_markup=markup
        )
        return
    show_main_menu(message.chat.id)

def show_main_menu(chat_id):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton(
        "🚀 Регистрация",
        url=f"{REGISTER_URL}&sub_id1={chat_id}"
    ))
    markup.add(InlineKeyboardButton("🆔 Ввести ID", callback_data="enter_id"))
    markup.add(InlineKeyboardButton("🔐 Проверить доступ", callback_data="check_access"))
    bot.send_message(
        chat_id,
        "💎 KENT AI | Сигналы\n\n1. Подпишись на канал\n2. Зарегистрируйся\n3. Сделай депозит\n4. Отправь Trader ID\n5. Получи доступ к mini app",
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: True)
def callback(call):
    user_id = str(call.message.chat.id)

    if call.data == "check_sub":
        if is_subscribed(call.message.chat.id):
            bot.send_message(call.message.chat.id, "✅ Подписка подтверждена")
            show_main_menu(call.message.chat.id)
        else:
            bot.send_message(call.message.chat.id, "❌ Подписка не найдена")

    elif call.data == "enter_id":
        bot.send_message(call.message.chat.id, "🆔 Отправь свой Trader ID одним сообщением")

    elif call.data == "check_access":
        r = requests.get(f"{DOMAIN}/check/{user_id}", timeout=10).json()
        if r.get("status") == "approved":
            send_signal_button(call.message.chat.id)
        elif r.get("status") == "registered":
            bot.send_message(call.message.chat.id, "📝 Регистрация найдена, но депозит ещё не найден")
        else:
            bot.send_message(call.message.chat.id, "❌ Нет доступа. Сначала регистрация, депозит и проверка ID")

@bot.message_handler(func=lambda message: True)
def handle_text(message):
    text = (message.text or "").strip()
    if not text.isdigit():
        return
    r = requests.get(f"{DOMAIN}/check_id/{text}", timeout=10).json()
    status = r.get("status")
    if status == "approved":
        bot.send_message(message.chat.id, "✅ ID найден, депозит подтверждён")
        send_signal_button(message.chat.id)
    elif status == "registered":
        bot.send_message(message.chat.id, "📝 ID найден, но депозит ещё не найден")
    else:
        bot.send_message(message.chat.id, "❌ ID не найден или депозит отсутствует")

bot.infinity_polling()
