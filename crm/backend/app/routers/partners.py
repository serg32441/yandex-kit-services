from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Partner, Request
from ..schemas import PartnerCreate, PartnerUpdate, PartnerOut

router = APIRouter()


@router.get("", response_model=List[PartnerOut])
def list_partners(
    city_id: Optional[int] = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(Partner)
    if city_id:
        q = q.filter(Partner.city_id == city_id)
    if active_only:
        q = q.filter(Partner.is_active == True)
    return q.order_by(Partner.name).all()


@router.post("", response_model=PartnerOut)
def create_partner(payload: PartnerCreate, db: Session = Depends(get_db)):
    partner = Partner(**payload.model_dump())
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner


@router.get("/{partner_id}", response_model=PartnerOut)
def get_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнёр не найден")
    return partner


@router.patch("/{partner_id}", response_model=PartnerOut)
def update_partner(partner_id: int, payload: PartnerUpdate, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнёр не найден")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(partner, field, value)
    db.commit()
    db.refresh(partner)
    return partner


@router.delete("/{partner_id}")
def deactivate_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнёр не найден")
    partner.is_active = False
    db.commit()
    return {"ok": True}
