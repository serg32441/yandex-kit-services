"""
Telegram bot for partners.
Run with: python -m bot.bot
"""
import asyncio
import os
import httpx
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_URL = os.getenv("BACKEND_URL", "http://backend:8000")

STATUS_LABELS = {
    "new": "🆕 Новая",
    "transferred": "📤 Передана партнёру",
    "in_progress": "🔧 В работе",
    "waiting_parts": "🔩 Ожидает запчасти",
    "parts_sent": "📦 Запчасти отправлены",
    "done": "✅ Готово",
    "closed": "💰 Закрыта / Оплачена",
}


def build_status_keyboard(request_id: int, current_status: str) -> InlineKeyboardMarkup | None:
    if current_status == "transferred":
        rows = [[
            InlineKeyboardButton("✅ Принял в работу", callback_data=f"status:{request_id}:in_progress"),
            InlineKeyboardButton("❌ Не могу взять", callback_data=f"status:{request_id}:new"),
        ]]
    elif current_status in ("in_progress", "parts_sent"):
        rows = [[
            InlineKeyboardButton("🔩 Нужны запчасти", callback_data=f"parts:{request_id}"),
            InlineKeyboardButton("✅ Готово", callback_data=f"done:{request_id}"),
        ]]
    elif current_status == "waiting_parts":
        rows = [[
            InlineKeyboardButton("✅ Готово", callback_data=f"done:{request_id}"),
        ]]
    else:
        return None
    return InlineKeyboardMarkup(rows)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    uid = update.effective_user.id
    await update.message.reply_text(
        f"👋 Привет! Это бот для управления заявками на ремонт.\n\n"
        f"Ваш Telegram ID: `{uid}`\n\n"
        f"Сообщите этот ID вашему менеджеру, чтобы он привязал ваш аккаунт в системе.\n"
        f"После этого вы будете получать заявки прямо здесь.",
        parse_mode="Markdown",
    )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    data = query.data
    telegram_id = str(update.effective_user.id)

    if data.startswith("status:"):
        _, request_id_str, new_status = data.split(":")
        request_id = int(request_id_str)
        await _update_status(query, request_id, new_status, telegram_id)

    elif data.startswith("done:"):
        request_id = int(data.split(":")[1])
        context.user_data["done_request_id"] = request_id
        await query.message.reply_text(
            "💰 Укажите стоимость ремонта (только цифры, например: 5000):"
        )

    elif data.startswith("parts:"):
        request_id = int(data.split(":")[1])
        context.user_data["parts_request_id"] = request_id
        await query.message.reply_text(
            "🔩 Укажите необходимые запчасти — каждую с новой строки:\n\n"
            "Пример:\nМотор DC-24V — 1 шт\nКнопка включения — 2 шт"
        )


async def _update_status(query, request_id: int, new_status: str, telegram_id: str) -> None:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.patch(
                f"{API_URL}/api/requests/{request_id}/status",
                json={
                    "status": new_status,
                    "changed_by": f"partner:{telegram_id}",
                    "comment": "Обновлено через Telegram",
                },
                timeout=10,
            )
            if resp.status_code == 200:
                label = STATUS_LABELS.get(new_status, new_status)
                keyboard = build_status_keyboard(request_id, new_status)
                original = query.message.text or ""
                suffix = f"\n\n▶️ Статус: {label}"
                if suffix not in original:
                    original += suffix
                await query.edit_message_text(text=original, reply_markup=keyboard)
            else:
                await query.edit_message_text("❌ Ошибка обновления статуса. Попробуйте ещё раз.")
        except Exception as e:
            await query.edit_message_text(f"❌ Ошибка соединения с сервером: {e}")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    telegram_id = str(update.effective_user.id)
    text = update.message.text.strip()

    # Handling "done" — user entered repair cost
    if "done_request_id" in context.user_data:
        request_id = context.user_data.pop("done_request_id")
        try:
            amount = float(text.replace(",", ".").replace(" ", ""))
        except ValueError:
            await update.message.reply_text("❌ Введите сумму числом, например: 5000")
            context.user_data["done_request_id"] = request_id
            return

        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{API_URL}/api/requests/{request_id}/status",
                json={
                    "status": "done",
                    "changed_by": f"partner:{telegram_id}",
                    "comment": f"Ремонт завершён. Стоимость: {amount} руб.",
                    "total_amount": amount,
                },
                timeout=10,
            )

        commission = round(amount * 0.3, 2)
        partner_income = round(amount * 0.7, 2)
        await update.message.reply_text(
            f"✅ Заявка #{request_id} завершена!\n\n"
            f"💰 Сумма ремонта: {amount:.0f} руб.\n"
            f"📊 Ваша доля (70%): {partner_income:.0f} руб.\n"
            f"🏢 Комиссия (30%): {commission:.0f} руб."
        )
        return

    # Handling spare parts request
    if "parts_request_id" in context.user_data:
        request_id = context.user_data.pop("parts_request_id")
        parts = [line.strip() for line in text.split("\n") if line.strip()]

        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{API_URL}/api/requests/{request_id}/status",
                json={
                    "status": "waiting_parts",
                    "changed_by": f"partner:{telegram_id}",
                    "comment": "Требуются запчасти",
                },
                timeout=10,
            )
            for part in parts:
                await client.post(
                    f"{API_URL}/api/requests/{request_id}/spare-parts",
                    json={"part_name": part, "quantity": 1},
                    timeout=10,
                )

        await update.message.reply_text(
            f"✅ Запрос на запчасти отправлен менеджеру:\n\n"
            + "\n".join(f"• {p}" for p in parts)
        )
        return

    await update.message.reply_text(
        "Используйте кнопки под уведомлениями для управления заявками.\n"
        f"Ваш Telegram ID: `{telegram_id}`",
        parse_mode="Markdown",
    )


def main() -> None:
    if not TELEGRAM_TOKEN:
        print("TELEGRAM_BOT_TOKEN не задан — бот не запускается.")
        return

    app = (
        Application.builder()
        .token(TELEGRAM_TOKEN)
        .get_updates_read_timeout(15)
        .get_updates_write_timeout(15)
        .get_updates_connect_timeout(15)
        .get_updates_pool_timeout(15)
        .build()
    )
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("Telegram bot started (long polling)...")
    app.run_polling(drop_pending_updates=True, timeout=10)


if __name__ == "__main__":
    main()
