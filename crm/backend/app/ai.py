"""
ИИ-анализ заявки через OpenRouter (OpenAI-совместимый API).

Используется по требованию (кнопка в карточке заявки), а не для каждой заявки —
так мы не тратим токены на массовый список, но даём качественную рекомендацию там,
где она нужна. Если ключ не задан или модель недоступна — graceful fallback.

Конфигурация через переменные окружения:
  OPENROUTER_API_KEY   — ключ (обязателен для работы ИИ; в репозиторий не коммитим)
  OPENROUTER_MODEL     — модель (по умолчанию tencent/hy3-preview)
  OPENROUTER_BASE_URL  — базовый URL API
"""
import os
import json
import re
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "tencent/hy3-preview")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

SYSTEM_PROMPT = (
    "Ты — аналитик CRM сервисного бизнеса по ремонту оборудования. "
    "Менеджер принимает заявки от клиентов и распределяет их партнёрам в разных городах, "
    "беря комиссию с каждой выполненной заявки. "
    "Твоя задача — кратко оценить конкретную заявку и подсказать менеджеру, что делать. "
    "Отвечай ТОЛЬКО валидным JSON без markdown-обёртки, строго по схеме:\n"
    '{"priority":"high|medium|low",'
    '"summary":"1-2 предложения о сути и состоянии заявки",'
    '"next_action":"одно конкретное следующее действие менеджера",'
    '"estimated_value":"оценка потенциальной выгоды/комиссии словами",'
    '"risks":["короткий риск 1","короткий риск 2"]}'
    "\nВсе тексты — на русском языке, кратко и по делу."
)

STATUS_RU = {
    "new": "Новая (не распределена)",
    "transferred": "Передана партнёру (не принята)",
    "in_progress": "В работе у партнёра",
    "waiting_parts": "Ожидает запчасти",
    "parts_sent": "Запчасти отправлены",
    "done": "Готово",
    "closed": "Закрыта / оплачена",
}


def ai_available() -> bool:
    return bool(OPENROUTER_API_KEY)


def _build_user_prompt(req, rule) -> str:
    city = req.city.name if getattr(req, "city", None) else "не указан"
    partner = req.partner.name if getattr(req, "partner", None) else "не назначен"
    lines = [
        f"Заявка #{req.id}",
        f"Статус: {STATUS_RU.get(req.status, req.status)}",
        f"Источник: {req.source}",
        f"Город: {city}",
        f"Партнёр: {partner}",
        f"Оборудование: {req.equipment_type or 'не указано'}",
        f"Описание проблемы: {req.description or 'нет'}",
        f"Сумма ремонта: {req.total_amount if req.total_amount else 'ещё не определена'}",
        f"Создана: {req.created_at}",
        f"Последнее обновление: {req.updated_at}",
        "",
        f"Предварительный скоринг системы: приоритет {rule['priority']}, балл {rule['score']}/100.",
        "Факторы: " + "; ".join(rule["score_factors"]),
    ]
    return "\n".join(lines)


def _parse_json(text: str) -> dict | None:
    if not text:
        return None
    text = text.strip()

    # Direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Markdown code blocks: ```json ... ``` or ``` ... ```
    for pat in [r'```json\s*(\{.*?\})\s*```', r'```\s*(\{.*?\})\s*```']:
        m = re.search(pat, text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception:
                pass

    # Find outermost JSON object by tracking brace depth (handles nested objects)
    start = text.find('{')
    if start != -1:
        depth = 0
        in_str = False
        esc = False
        for i, ch in enumerate(text[start:], start):
            if esc:
                esc = False
                continue
            if ch == '\\' and in_str:
                esc = True
                continue
            if ch == '"':
                in_str = not in_str
                continue
            if in_str:
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except Exception:
                        break
    return None


def analyze_request(req, rule) -> dict:
    """Возвращает структурированный разбор заявки от ИИ или fallback."""
    if not ai_available():
        return {
            "available": False,
            "error": "ИИ не настроен. Задайте OPENROUTER_API_KEY на сервере.",
        }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_prompt(req, rule)},
        ],
        "temperature": 0.3,
        "max_tokens": 600,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-Title": "Repair CRM",
    }

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
        if resp.status_code != 200:
            return {
                "available": True,
                "model": OPENROUTER_MODEL,
                "error": f"ИИ вернул ошибку {resp.status_code}. Попробуйте позже.",
            }
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
    except Exception as e:
        return {
            "available": True,
            "model": OPENROUTER_MODEL,
            "error": f"Не удалось получить ответ ИИ: {e}",
        }

    parsed = _parse_json(content)
    if not parsed:
        # Модель ответила не-JSON — отдадим текст как summary
        return {
            "available": True,
            "model": OPENROUTER_MODEL,
            "priority": rule["priority"],
            "summary": content.strip()[:1000],
            "next_action": rule["recommendation"],
            "estimated_value": None,
            "risks": [],
        }

    risks = parsed.get("risks") or []
    if isinstance(risks, str):
        risks = [risks]

    return {
        "available": True,
        "model": OPENROUTER_MODEL,
        "priority": parsed.get("priority") or rule["priority"],
        "summary": parsed.get("summary"),
        "next_action": parsed.get("next_action") or rule["recommendation"],
        "estimated_value": parsed.get("estimated_value"),
        "risks": [str(r) for r in risks][:5],
    }


BUSINESS_SYSTEM_PROMPT = (
    "Ты — бизнес-аналитик CRM сервисного бизнеса по ремонту оборудования. "
    "Менеджер принимает заявки от клиентов и распределяет их партнёрам в разных городах, "
    "беря комиссию с каждой выполненной заявки. "
    "На основе сводных данных дай короткую деловую сводку и практические рекомендации — "
    "на чём менеджеру сфокусироваться, чтобы не терять заявки и зарабатывать больше. "
    "Отвечай ТОЛЬКО валидным JSON без markdown, строго по схеме:\n"
    '{"headline":"одно предложение — общая картина за период",'
    '"highlights":["что идёт хорошо, 1-3 пункта"],'
    '"attention":["проблемы и риски, требующие внимания, 1-4 пункта"],'
    '"recommendations":["конкретные следующие действия, 2-4 пункта"]}'
    "\nВсе тексты — на русском, кратко и по делу, с цифрами где уместно."
)


def _fmt_business(stats: dict) -> str:
    lines = [
        f"Период: {stats.get('period')}",
        f"Заявок за период: {stats.get('total_this_month')}",
        f"Активных заявок сейчас: {stats.get('total_active')}",
        f"Заявок сегодня: {stats.get('total_today')}",
        f"Комиссия за период: {stats.get('commission_this_month')} руб.",
        f"Заявок с высоким приоритетом (требуют внимания): {stats.get('high_priority_count')}",
        "Распределение по статусам: "
        + ", ".join(f"{k}={v}" for k, v in (stats.get("by_status") or {}).items()),
    ]
    top = stats.get("top_partners") or []
    if top:
        lines.append("Топ партнёров (закрыто заявок / комиссия за период):")
        for p in top:
            lines.append(f"  • {p['name']} ({p.get('city') or 'без города'}): "
                         f"{p['closed']} закрыто, {p['commission']} руб.")
    idle = stats.get("idle_partners") or []
    if idle:
        lines.append("Активные партнёры без закрытых заявок за период: "
                     + ", ".join(idle))
    uncovered = stats.get("uncovered_cities") or []
    if uncovered:
        lines.append("Города с заявками, но без активных партнёров: "
                     + ", ".join(uncovered))
    return "\n".join(lines)


def business_summary(stats: dict) -> dict:
    """Генерирует ИИ-сводку по всему бизнесу на основе агрегированных данных."""
    if not ai_available():
        return {
            "available": False,
            "error": "ИИ не настроен. Задайте OPENROUTER_API_KEY на сервере.",
        }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": BUSINESS_SYSTEM_PROMPT},
            {"role": "user", "content": _fmt_business(stats)},
        ],
        "temperature": 0.4,
        "max_tokens": 800,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-Title": "Repair CRM",
    }

    try:
        with httpx.Client(timeout=50) as client:
            resp = client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
        if resp.status_code != 200:
            return {"available": True, "model": OPENROUTER_MODEL,
                    "error": f"ИИ вернул ошибку {resp.status_code}. Попробуйте позже."}
        content = resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return {"available": True, "model": OPENROUTER_MODEL,
                "error": f"Не удалось получить ответ ИИ: {e}"}

    parsed = _parse_json(content)
    if not parsed:
        return {"available": True, "model": OPENROUTER_MODEL,
                "headline": content.strip()[:600],
                "highlights": [], "attention": [], "recommendations": []}

    def _as_list(v):
        if not v:
            return []
        if isinstance(v, str):
            return [v]
        return [str(x) for x in v][:6]

    return {
        "available": True,
        "model": OPENROUTER_MODEL,
        "headline": parsed.get("headline"),
        "highlights": _as_list(parsed.get("highlights")),
        "attention": _as_list(parsed.get("attention")),
        "recommendations": _as_list(parsed.get("recommendations")),
    }


PARSE_SYSTEM_PROMPT = (
    "Ты — ассистент менеджера сервиса по ремонту оборудования. "
    "Менеджер надиктовал или вставил текст новой заявки от клиента. "
    "Извлеки из текста структурированные данные. "
    "Отвечай ТОЛЬКО валидным JSON без markdown, строго по схеме:\n"
    '{"client_name":"имя клиента или null",'
    '"client_phone":"телефон или null",'
    '"city":"название города или null",'
    '"equipment_type":"что за оборудование / что сломалось, кратко, или null",'
    '"description":"описание проблемы или null",'
    '"source":"avito|phone|repeat|referral|other"}'
    "\nПравила: телефон по возможности нормализуй в формат +7XXXXXXXXXX. "
    "Если поля нет в тексте — ставь null. source выбери наиболее подходящий, "
    "по умолчанию phone, если клиент звонил. Все значения — на русском."
)


def parse_request_text(text: str) -> dict:
    """Извлекает поля заявки из свободного текста (надиктованного голосом)."""
    if not ai_available():
        return {"available": False,
                "error": "ИИ не настроен. Задайте OPENROUTER_API_KEY на сервере."}

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": PARSE_SYSTEM_PROMPT},
            {"role": "user", "content": text.strip()[:4000]},
        ],
        "temperature": 0.1,
        "max_tokens": 400,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "X-Title": "Repair CRM",
    }

    try:
        with httpx.Client(timeout=40) as client:
            resp = client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )
        if resp.status_code != 200:
            return {"available": True, "model": OPENROUTER_MODEL,
                    "error": f"ИИ вернул ошибку {resp.status_code}. Попробуйте позже."}
        content = resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return {"available": True, "model": OPENROUTER_MODEL,
                "error": f"Не удалось получить ответ ИИ: {e}"}

    parsed = _parse_json(content)
    if not parsed:
        return {"available": True, "model": OPENROUTER_MODEL,
                "error": "Не удалось распознать данные из текста. Попробуйте сформулировать иначе."}

    valid_sources = {"avito", "phone", "repeat", "referral", "other"}
    source = (parsed.get("source") or "phone").strip().lower()
    if source not in valid_sources:
        source = "phone"

    def _clean(v):
        if v is None:
            return None
        s = str(v).strip()
        return s if s and s.lower() not in ("null", "none", "—", "-") else None

    return {
        "available": True,
        "model": OPENROUTER_MODEL,
        "client_name": _clean(parsed.get("client_name")),
        "client_phone": _clean(parsed.get("client_phone")),
        "city": _clean(parsed.get("city")),
        "equipment_type": _clean(parsed.get("equipment_type")),
        "description": _clean(parsed.get("description")),
        "source": source,
    }
