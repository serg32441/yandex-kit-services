import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import date, datetime, timezone
from ..database import get_db
from ..models import Request, StatusLog, SparePartRequest, Partner, City
from ..schemas import (
    RequestCreate,
    RequestUpdate,
    RequestOut,
    RequestListOut,
    StatusUpdate,
    SparePartCreate,
    SparePartUpdate,
    SparePartOut,
    AIInsight,
    RequestParseIn,
    RequestParseOut,
)
from .. import telegram, scoring, ai

router = APIRouter()

VALID_STATUSES = {
    "new", "transferred", "in_progress", "waiting_parts", "parts_sent", "done", "closed"
}

ACTIVE_STATUSES = {"new", "transferred", "in_progress", "waiting_parts", "parts_sent"}


@router.get("", response_model=List[RequestListOut])
def list_requests(
    status: Optional[str] = None,
    city_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Request)
    if status:
        q = q.filter(Request.status == status)
    if city_id:
        q = q.filter(Request.city_id == city_id)
    if partner_id:
        q = q.filter(Request.partner_id == partner_id)
    if date_from:
        q = q.filter(Request.created_at >= datetime(date_from.year, date_from.month, date_from.day))
    if date_to:
        q = q.filter(Request.created_at < datetime(date_to.year, date_to.month, date_to.day + 1))
    if search:
        like = f"%{search}%"
        q = q.filter(
            Request.client_name.ilike(like) | Request.client_phone.ilike(like)
        )
    rows = q.order_by(desc(Request.created_at)).offset(skip).limit(limit).all()
    now = datetime.now(timezone.utc)
    for r in rows:
        scoring.enrich(r, now)
    return rows


@router.get("/priorities", response_model=List[RequestListOut])
def priorities(
    limit: int = Query(default=6, le=20),
    db: Session = Depends(get_db),
):
    """Активные заявки, отсортированные по приоритету — «на что обратить внимание»."""
    rows = db.query(Request).filter(Request.status.in_(ACTIVE_STATUSES)).all()
    now = datetime.now(timezone.utc)
    for r in rows:
        scoring.enrich(r, now)
    rows.sort(key=lambda r: r.score, reverse=True)
    return rows[:limit]


@router.post("/parse", response_model=RequestParseOut)
def parse_request(payload: RequestParseIn, db: Session = Depends(get_db)):
    """Распознаёт поля заявки из надиктованного/вставленного текста через ИИ."""
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Пустой текст")

    result = ai.parse_request_text(text)
    if not result.get("available") or result.get("error"):
        return RequestParseOut(
            available=result.get("available", False),
            model=result.get("model"),
            error=result.get("error"),
        )

    # Сопоставляем город: сначала по тому, что вернул ИИ, затем — сканируем
    # исходный текст на известные города (с учётом русских склонений).
    cities = db.query(City).all()

    def _find_city(haystack: Optional[str]):
        if not haystack:
            return None
        t = haystack.lower()
        for c in cities:
            cn = c.name.strip().lower()
            if cn in t:
                return c
            # Корень слова, чтобы поймать склонения: Москва→Москве, Казань→Казани
            if len(cn) >= 6:
                stem = re.escape(cn[:-2])
                if re.search(r'\b' + stem + r'[а-яё]*', t):
                    return c
        return None

    matched = _find_city(result.get("city")) or _find_city(text)
    city_id = matched.id if matched else None
    city_name = matched.name if matched else result.get("city")

    return RequestParseOut(
        available=True,
        model=result.get("model"),
        client_name=result.get("client_name"),
        client_phone=result.get("client_phone"),
        city_id=city_id,
        city_name=city_name,
        equipment_type=result.get("equipment_type"),
        description=result.get("description"),
        source=result.get("source"),
    )


@router.post("", response_model=RequestOut)
def create_request(payload: RequestCreate, db: Session = Depends(get_db)):
    req = Request(**payload.model_dump())
    if payload.partner_id:
        req.status = "transferred"
    db.add(req)
    db.flush()

    log = StatusLog(
        request_id=req.id,
        status=req.status,
        comment="Заявка создана",
        changed_by="manager",
    )
    db.add(log)
    db.commit()
    db.refresh(req)

    if payload.partner_id and req.partner and req.partner.telegram_id:
        telegram.send_request_notification(req.partner.telegram_id, req)

    return req


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    scoring.enrich(req)
    return req


@router.post("/{request_id}/ai-insight", response_model=AIInsight)
def ai_insight(request_id: int, db: Session = Depends(get_db)):
    """Глубокий ИИ-разбор заявки через OpenRouter (по запросу менеджера)."""
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    rule = scoring.score_request(req)
    return ai.analyze_request(req, rule)


@router.patch("/{request_id}", response_model=RequestOut)
def update_request(request_id: int, payload: RequestUpdate, db: Session = Depends(get_db)):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    old_partner_id = req.partner_id
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(req, field, value)

    # Auto-set commission when total_amount is updated
    if payload.total_amount is not None:
        req.commission_amount = round(payload.total_amount * 0.3, 2)

    # If partner just assigned, change status and notify
    if payload.partner_id and payload.partner_id != old_partner_id:
        if req.status == "new":
            req.status = "transferred"
            log = StatusLog(
                request_id=req.id,
                status="transferred",
                comment="Назначен партнёр",
                changed_by="manager",
            )
            db.add(log)
            db.flush()
            db.refresh(req)
            if req.partner and req.partner.telegram_id:
                telegram.send_request_notification(req.partner.telegram_id, req)

    db.commit()
    db.refresh(req)
    return req


@router.patch("/{request_id}/status", response_model=RequestOut)
def update_status(request_id: int, payload: StatusUpdate, db: Session = Depends(get_db)):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Недопустимый статус: {payload.status}")

    req.status = payload.status
    if payload.total_amount is not None:
        req.total_amount = payload.total_amount
        req.commission_amount = round(payload.total_amount * 0.3, 2)

    log = StatusLog(
        request_id=req.id,
        status=payload.status,
        comment=payload.comment,
        changed_by=payload.changed_by,
    )
    db.add(log)
    db.commit()
    db.refresh(req)

    # Если статус изменил менеджер (не сам партнёр через бота) — уведомим
    # партнёра в Telegram с актуальными кнопками управления заявкой.
    changed_by = payload.changed_by or ""
    if not changed_by.startswith("partner:"):
        if req.partner and req.partner.telegram_id:
            telegram.send_status_notification(req.partner.telegram_id, req.id, req.status)

    return req


@router.get("/{request_id}/spare-parts", response_model=List[SparePartOut])
def list_spare_parts(request_id: int, db: Session = Depends(get_db)):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return req.spare_parts


@router.post("/{request_id}/spare-parts", response_model=SparePartOut)
def add_spare_part(
    request_id: int, payload: SparePartCreate, db: Session = Depends(get_db)
):
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    part = SparePartRequest(request_id=request_id, **payload.model_dump())
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


@router.patch("/spare-parts/{part_id}", response_model=SparePartOut)
def update_spare_part(part_id: int, payload: SparePartUpdate, db: Session = Depends(get_db)):
    part = db.query(SparePartRequest).filter(SparePartRequest.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Запчасть не найдена")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(part, field, value)

    # When spare parts are sent, update the parent request status
    if payload.status == "sent":
        req = db.query(Request).filter(Request.id == part.request_id).first()
        if req and req.status == "waiting_parts":
            req.status = "parts_sent"
            log = StatusLog(
                request_id=req.id,
                status="parts_sent",
                comment="Запчасти отправлены",
                changed_by="manager",
            )
            db.add(log)
            if req.partner and req.partner.telegram_id:
                telegram.send_status_notification(req.partner.telegram_id, req.id, "parts_sent")

    db.commit()
    db.refresh(part)
    return part
