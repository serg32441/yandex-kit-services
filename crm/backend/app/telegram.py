import os
import requests as req_lib

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"


def _status_keyboard(request_id: int, status: str):
    """Единый набор кнопок управления заявкой для партнёра по текущему статусу."""
    if status == "transferred":
        rows = [[
            {"text": "✅ Принял в работу", "callback_data": f"status:{request_id}:in_progress"},
            {"text": "❌ Не могу взять", "callback_data": f"status:{request_id}:new"},
        ]]
    elif status in ("in_progress", "parts_sent"):
        rows = [[
            {"text": "🔩 Нужны запчасти", "callback_data": f"parts:{request_id}"},
            {"text": "✅ Готово", "callback_data": f"done:{request_id}"},
        ]]
    elif status == "waiting_parts":
        rows = [[
            {"text": "✅ Готово", "callback_data": f"done:{request_id}"},
        ]]
    else:
        return None
    return {"inline_keyboard": rows}


def send_request_notification(telegram_id: str, request) -> None:
    if not BOT_TOKEN or not telegram_id:
        return

    rid = request.id
    city_name = request.city.name if request.city else "н/д"
    keyboard = _status_keyboard(rid, "transferred")
    text = (
        f"🔔 *Новая заявка \\#{rid}*\n\n"
        f"👤 Клиент: {_esc(request.client_name)}\n"
        f"📞 Телефон: {_esc(request.client_phone)}\n"
        f"🏙️ Город: {_esc(city_name)}\n"
        f"🔧 Оборудование: {_esc(request.equipment_type or 'н/д')}\n"
        f"📝 Описание: {_esc(request.description or 'н/д')}\n"
    )
    _send(telegram_id, text, keyboard)


def send_status_notification(telegram_id: str, request_id: int, status: str) -> None:
    if not BOT_TOKEN or not telegram_id:
        return

    labels = {
        "new": "🆕 Новая",
        "transferred": "📤 Передана партнёру",
        "in_progress": "🔧 В работе",
        "waiting_parts": "🔩 Ожидает запчасти",
        "parts_sent": "📦 Запчасти отправлены",
        "done": "✅ Готово",
        "closed": "💰 Закрыта / Оплачена",
    }
    label = labels.get(status, status)

    keyboard = _status_keyboard(request_id, status)

    text = f"📋 Заявка \\#{request_id}: статус обновлён → *{label}*"
    _send(telegram_id, text, keyboard)


def _esc(text: str) -> str:
    for ch in r"\_*[]()~`>#+-=|{}.!":
        text = text.replace(ch, f"\\{ch}")
    return text


def _send(chat_id: str, text: str, keyboard=None) -> None:
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "MarkdownV2"}
    if keyboard:
        payload["reply_markup"] = keyboard
    try:
        req_lib.post(f"{TELEGRAM_API}/sendMessage", json=payload, timeout=5)
    except Exception as e:
        print(f"Telegram send error: {e}")
