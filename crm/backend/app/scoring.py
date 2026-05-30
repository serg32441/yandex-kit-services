"""
Скоринг заявок — быстрая объяснимая приоритизация без внешних зависимостей.

Возвращает балл 0-100, приоритет (high/medium/low), список понятных менеджеру
факторов и короткую рекомендацию «что делать». Считается на лету, не хранится в БД.

Балл складывается из двух частей:
  • ценность   (0-40) — источник заявки и полнота данных;
  • срочность   (0-60) — сколько заявка «висит» в текущем статусе без движения.
Срочность доминирует: чем дольше активная заявка без действий, тем выше приоритет.
"""
from datetime import datetime, timezone

# Вероятность хорошей конверсии/ценности по источнику заявки
SOURCE_WEIGHT = {
    "repeat": 22,    # повторный клиент — лучший
    "referral": 18,  # рекомендация
    "phone": 13,     # позвонил сам — тёплый контакт
    "avito": 9,
    "other": 5,
}

SOURCE_LABELS = {
    "repeat": "повторный клиент",
    "referral": "рекомендация",
    "phone": "звонок",
    "avito": "Авито",
    "other": "другое",
}

DONE_STATUSES = {"done", "closed"}


def _aware(dt):
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _hours_since(dt, now):
    dt = _aware(dt)
    if not dt:
        return 0.0
    return max(0.0, (now - dt).total_seconds() / 3600.0)


def _fmt_age(hours: float) -> str:
    if hours < 1:
        return "меньше часа"
    if hours < 24:
        return f"{int(hours)} ч"
    return f"{int(hours // 24)} дн"


def score_request(req, now=None) -> dict:
    now = now or datetime.now(timezone.utc)
    status = req.status or "new"

    if status in DONE_STATUSES:
        return {
            "score": 0,
            "priority": "low",
            "score_factors": ["Заявка завершена"],
            "recommendation": "Действий не требуется.",
        }

    score = 10
    factors = []

    # ── Ценность ──
    sw = SOURCE_WEIGHT.get(req.source, 5)
    score += sw
    if req.source in ("repeat", "referral"):
        factors.append(f"Тёплый источник — {SOURCE_LABELS.get(req.source, req.source)}")

    if not req.client_phone:
        factors.append("Нет телефона клиента")
        score -= 5
    if not req.city_id:
        factors.append("Не указан город")
    if not req.equipment_type:
        factors.append("Не указано оборудование")

    # ── Срочность по статусу и времени простоя ──
    idle = _hours_since(req.updated_at or req.created_at, now)
    age = _hours_since(req.created_at, now)
    recommendation = "Заявка под контролем."

    if status == "new":
        # Новая без партнёра — нужно распределить, чем дольше, тем критичнее
        if age > 24:
            score += 50
            factors.append(f"Новая заявка не распределена уже {_fmt_age(age)}")
        elif age > 6:
            score += 35
            factors.append(f"Новая заявка ждёт партнёра {_fmt_age(age)}")
        elif age > 2:
            score += 22
            factors.append("Новая заявка ещё не передана партнёру")
        else:
            score += 14
            factors.append("Свежая заявка — назначьте партнёра")
        recommendation = "Назначьте партнёра в нужном городе и передайте заявку."

    elif status == "transferred":
        # Передана, но партнёр ещё не принял в работу
        if idle > 24:
            score += 48
            factors.append(f"Партнёр не принял заявку {_fmt_age(idle)}")
            recommendation = "Партнёр давно молчит — напомните или переназначьте заявку."
        elif idle > 8:
            score += 34
            factors.append(f"Партнёр не отвечает {_fmt_age(idle)}")
            recommendation = "Напомните партнёру принять заявку в работу."
        elif idle > 3:
            score += 22
            factors.append("Партнёр пока не принял заявку")
            recommendation = "Проверьте, увидел ли партнёр заявку."
        else:
            score += 12
            recommendation = "Заявка передана — ждём ответа партнёра."

    elif status == "in_progress":
        if idle > 96:
            score += 40
            factors.append(f"В работе без движения {_fmt_age(idle)}")
            recommendation = "Ремонт сильно затянулся — уточните статус у партнёра."
        elif idle > 48:
            score += 26
            factors.append(f"В работе уже {_fmt_age(idle)}")
            recommendation = "Уточните у партнёра, как продвигается ремонт."
        else:
            score += 12
            recommendation = "Ремонт идёт — следите за сроками."

    elif status == "waiting_parts":
        if idle > 72:
            score += 38
            factors.append(f"Ждёт запчасти {_fmt_age(idle)}")
            recommendation = "Запчасти задерживаются — проверьте заказ и отправку."
        elif idle > 24:
            score += 26
            factors.append(f"Ожидает запчасти {_fmt_age(idle)}")
            recommendation = "Проверьте, заказаны и отправлены ли запчасти."
        else:
            score += 14
            recommendation = "Оформите и отправьте запчасти партнёру."

    elif status == "parts_sent":
        if idle > 48:
            score += 30
            factors.append(f"Запчасти отправлены {_fmt_age(idle)} назад, ремонт не завершён")
            recommendation = "Уточните у партнёра, продолжен ли ремонт после запчастей."
        else:
            score += 16
            recommendation = "Запчасти у партнёра — ожидаем завершения ремонта."

    score = max(0, min(100, score))

    if score >= 65:
        priority = "high"
    elif score >= 38:
        priority = "medium"
    else:
        priority = "low"

    if not factors:
        factors.append("Заявка в штатном режиме")

    return {
        "score": score,
        "priority": priority,
        "score_factors": factors,
        "recommendation": recommendation,
    }


def enrich(req, now=None):
    """Проставляет вычисленные поля скоринга на ORM-объект заявки."""
    result = score_request(req, now)
    req.score = result["score"]
    req.priority = result["priority"]
    req.score_factors = result["score_factors"]
    req.recommendation = result["recommendation"]
    return req
