# -*- coding: utf-8 -*-
import requests
import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

TOKEN = "8390334757:AAGZ0iTQMW90-eZLvsQsYheB_mtEoimeq3w"
DOMAIN = "https://kent-ai-bot.onrender.com"
REQUIRED_CHANNEL = -1003810263177
SUPPORT_URL = "https://t.me/Ke89nt"
CHANNEL_URL = "https://t.me/+jUfPvsXK3vUxZjMy"

bot = telebot.TeleBot(TOKEN, parse_mode="HTML")

REGISTER_URL = (
    "https://u3.shortink.io/register"
    "?utm_campaign=840644"
    "&utm_source=affiliate"
    "&utm_medium=sr"
    "&a=gaQWS5fftwSPOE"
    "&ac=89kent"
    "&code=WELCOME50"
)

def api_get(path, **kwargs):
    return requests.get(f"{DOMAIN}{path}", timeout=20, **kwargs)

def api_post(path, **kwargs):
    return requests.post(f"{DOMAIN}{path}", timeout=20, **kwargs)

def is_subscribed(user_id):
    try:
        member = bot.get_chat_member(REQUIRED_CHANNEL, user_id)
        return member.status in ["member", "administrator", "creator"]
    except Exception:
        return False

def show_subscribe(uid):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("📢 Подписаться", url=CHANNEL_URL))
    markup.add(InlineKeyboardButton("✅ Я подписался", callback_data="check_sub"))
    bot.send_message(uid, "❌ Для доступа к боту сначала подпишись на основной канал.", reply_markup=markup)

def show_main_menu(uid):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🚀 Регистрация", url=f"{REGISTER_URL}&sub_id1={uid}"))
    markup.add(InlineKeyboardButton("🆔 Ввести ID", callback_data="enter_id"))
    markup.add(InlineKeyboardButton("🔐 Проверить доступ", callback_data="check_access"))
    markup.add(InlineKeyboardButton("📞 Поддержка", url=SUPPORT_URL))
    bot.send_message(uid, "💎 <b>KENT AI | Сигналы</b>\n\n1. Подпишись на канал\n2. Зарегистрируйся\n3. Сделай депозит\n4. Введи Trader ID\n5. Получи доступ к mini app", reply_markup=markup)

def open_signals(uid):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("📊 Открыть сигналы", web_app=WebAppInfo(url=f"{DOMAIN}/miniapp?user_id={uid}&lang=ru")))
    bot.send_message(uid, "✅ Доступ к сигналам открыт.", reply_markup=markup)

@bot.message_handler(commands=["start"])
def start(message):
    uid = message.chat.id
    if not is_subscribed(uid):
        show_subscribe(uid)
        return
    show_main_menu(uid)

@bot.callback_query_handler(func=lambda call: True)
def callback(call):
    uid = call.message.chat.id
    if call.data == "check_sub":
        if is_subscribed(uid):
            bot.send_message(uid, "✅ Подписка подтверждена")
            show_main_menu(uid)
        else:
            bot.send_message(uid, "❌ Подписка не найдена")
    elif call.data == "enter_id":
        bot.send_message(uid, "🆔 Отправь свой Trader ID одним сообщением")
    elif call.data == "check_access":
        r = api_get(f"/check/{uid}").json()
        status = r.get("status", "none")
        if status == "approved":
            open_signals(uid)
        elif status == "registered":
            bot.send_message(uid, "💰 Сделай первый депозит, потом снова нажми «Проверить доступ» или отправь Trader ID.")
        else:
            bot.send_message(uid, "❌ Нет доступа. Сначала регистрация, депозит и проверка ID.")

@bot.message_handler(func=lambda m: True)
def handle_text(message):
    uid = message.chat.id
    text = (message.text or "").strip()
    if not text.isdigit():
        return
    r = api_post("/bind_id", json={"telegram_id": str(uid), "trader_id": text}).json()
    status = r.get("status")
    if status == "approved":
        bot.send_message(uid, "✅ ID найден, депозит подтверждён.")
        open_signals(uid)
    elif status == "registered":
        bot.send_message(uid, "📝 ID найден, но депозит ещё не найден.")
    elif status == "blocked":
        bot.send_message(uid, "❌ Этот Trader ID уже привязан к другому Telegram ID.")
    else:
        bot.send_message(uid, "❌ ID не найден или депозит отсутствует.")

if __name__ == "__main__":
    bot.infinity_polling(skip_pending=True)
