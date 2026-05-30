from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timezone
from ..database import get_db
from ..models import Request, StatusLog, Partner, City
from ..schemas import DashboardStats, RequestListOut, AIBusinessSummary
from .. import scoring, ai

router = APIRouter()

ACTIVE_STATUSES = {"transferred", "in_progress", "waiting_parts", "parts_sent"}
ALL_ACTIVE_STATUSES = {"new", "transferred", "in_progress", "waiting_parts", "parts_sent"}


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    today_start = datetime(today.year, today.month, today.day)

    total_today = (
        db.query(func.count(Request.id))
        .filter(Request.created_at >= today_start)
        .scalar()
    )

    total_active = (
        db.query(func.count(Request.id))
        .filter(Request.status.in_(ACTIVE_STATUSES))
        .scalar()
    )

    status_counts = db.query(Request.status, func.count(Request.id)).group_by(Request.status).all()
    by_status = {s: c for s, c in status_counts}

    month_start = datetime(today.year, today.month, 1)

    total_this_month = (
        db.query(func.count(Request.id))
        .filter(Request.created_at >= month_start)
        .scalar()
    )

    commission_row = (
        db.query(func.coalesce(func.sum(Request.commission_amount), 0))
        .filter(Request.status.in_({"done", "closed"}))
        .filter(Request.updated_at >= month_start)
        .scalar()
    )

    recent = (
        db.query(Request)
        .order_by(Request.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardStats(
        total_today=total_today or 0,
        total_active=total_active or 0,
        total_this_month=total_this_month or 0,
        by_status=by_status,
        recent_requests=recent,
        commission_this_month=float(commission_row or 0),
    )


@router.post("/ai-summary", response_model=AIBusinessSummary)
def ai_summary(db: Session = Depends(get_db)):
    """ИИ-сводка по всему бизнесу на основе агрегированных данных за месяц."""
    today = date.today()
    today_start = datetime(today.year, today.month, today.day)
    month_start = datetime(today.year, today.month, 1)
    now = datetime.now(timezone.utc)

    total_today = db.query(func.count(Request.id)).filter(Request.created_at >= today_start).scalar()
    total_active = db.query(func.count(Request.id)).filter(Request.status.in_(ACTIVE_STATUSES)).scalar()
    total_this_month = db.query(func.count(Request.id)).filter(Request.created_at >= month_start).scalar()
    commission_row = (
        db.query(func.coalesce(func.sum(Request.commission_amount), 0))
        .filter(Request.status.in_({"done", "closed"}))
        .filter(Request.updated_at >= month_start)
        .scalar()
    )
    status_counts = db.query(Request.status, func.count(Request.id)).group_by(Request.status).all()
    by_status = {s: c for s, c in status_counts}

    # Активные заявки + скоринг для подсчёта «горящих»
    active = db.query(Request).filter(Request.status.in_(ALL_ACTIVE_STATUSES)).all()
    high_priority = 0
    for r in active:
        scoring.enrich(r, now)
        if r.priority == "high":
            high_priority += 1

    # Топ партнёров по закрытым заявкам и комиссии за месяц
    partner_rows = (
        db.query(
            Partner.name,
            City.name,
            func.count(Request.id),
            func.coalesce(func.sum(Request.commission_amount), 0),
        )
        .join(Request, Request.partner_id == Partner.id)
        .outerjoin(City, Partner.city_id == City.id)
        .filter(Request.status.in_({"done", "closed"}))
        .filter(Request.updated_at >= month_start)
        .group_by(Partner.id, City.name)
        .order_by(func.count(Request.id).desc())
        .limit(5)
        .all()
    )
    top_partners = [
        {"name": name, "city": city, "closed": int(cnt), "commission": float(comm)}
        for name, city, cnt, comm in partner_rows
    ]

    # Активные партнёры без закрытых заявок за период
    closed_partner_ids = {
        pid for (pid,) in db.query(Request.partner_id)
        .filter(Request.status.in_({"done", "closed"}))
        .filter(Request.updated_at >= month_start)
        .filter(Request.partner_id.isnot(None))
        .distinct()
        .all()
    }
    active_partners = db.query(Partner).filter(Partner.is_active == True).all()
    idle_partners = [p.name for p in active_partners if p.id not in closed_partner_ids][:10]

    # Города с активными заявками, но без активных партнёров
    cities = db.query(City).all()
    city_active_partners = {
        c.id: db.query(func.count(Partner.id))
        .filter(Partner.city_id == c.id, Partner.is_active == True).scalar()
        for c in cities
    }
    uncovered = []
    for c in cities:
        active_in_city = (
            db.query(func.count(Request.id))
            .filter(Request.city_id == c.id, Request.status.in_(ALL_ACTIVE_STATUSES))
            .scalar()
        )
        if active_in_city and not city_active_partners.get(c.id):
            uncovered.append(c.name)

    stats = {
        "period": today.strftime("%B %Y"),
        "total_today": total_today or 0,
        "total_active": total_active or 0,
        "total_this_month": total_this_month or 0,
        "commission_this_month": float(commission_row or 0),
        "high_priority_count": high_priority,
        "by_status": by_status,
        "top_partners": top_partners,
        "idle_partners": idle_partners,
        "uncovered_cities": uncovered[:10],
    }

    return ai.business_summary(stats)
