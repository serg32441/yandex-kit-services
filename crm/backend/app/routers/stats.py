from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from ..database import get_db
from ..models import Request, StatusLog
from ..schemas import DashboardStats, RequestListOut

router = APIRouter()

ACTIVE_STATUSES = {"transferred", "in_progress", "waiting_parts", "parts_sent"}


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
