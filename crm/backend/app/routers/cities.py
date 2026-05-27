from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import City
from ..schemas import CityCreate, CityOut

router = APIRouter()


@router.get("", response_model=List[CityOut])
def list_cities(db: Session = Depends(get_db)):
    return db.query(City).order_by(City.name).all()


@router.post("", response_model=CityOut)
def create_city(payload: CityCreate, db: Session = Depends(get_db)):
    existing = db.query(City).filter(City.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Город уже существует")
    city = City(name=payload.name)
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


@router.delete("/{city_id}")
def delete_city(city_id: int, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="Город не найден")
    db.delete(city)
    db.commit()
    return {"ok": True}
