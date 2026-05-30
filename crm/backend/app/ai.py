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
    try:
        return json.loads(text)
    except Exception:
        pass
    # Иногда модель оборачивает JSON в ```json ... ``` или текст
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
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
