from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CityBase(BaseModel):
    name: str


class CityCreate(CityBase):
    pass


class CityOut(CityBase):
    id: int
    model_config = {"from_attributes": True}


class PartnerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    city_id: Optional[int] = None
    is_active: bool = True


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    city_id: Optional[int] = None
    is_active: Optional[bool] = None


class PartnerOut(PartnerBase):
    id: int
    created_at: datetime
    city: Optional[CityOut] = None
    model_config = {"from_attributes": True}


class StatusLogOut(BaseModel):
    id: int
    status: str
    comment: Optional[str] = None
    created_at: datetime
    changed_by: str
    model_config = {"from_attributes": True}


class SparePartOut(BaseModel):
    id: int
    part_name: str
    quantity: int
    price: Optional[float] = None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class SparePartCreate(BaseModel):
    part_name: str
    quantity: int = 1
    price: Optional[float] = None


class SparePartUpdate(BaseModel):
    price: Optional[float] = None
    status: Optional[str] = None
    quantity: Optional[int] = None


class RequestBase(BaseModel):
    client_name: str
    client_phone: str
    city_id: Optional[int] = None
    equipment_type: Optional[str] = None
    description: Optional[str] = None
    source: str = "avito"


class RequestCreate(RequestBase):
    partner_id: Optional[int] = None


class RequestUpdate(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    city_id: Optional[int] = None
    partner_id: Optional[int] = None
    equipment_type: Optional[str] = None
    description: Optional[str] = None
    total_amount: Optional[float] = None
    commission_amount: Optional[float] = None
    partner_comment: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None
    changed_by: str = "manager"
    total_amount: Optional[float] = None


class RequestListOut(BaseModel):
    id: int
    client_name: str
    client_phone: str
    status: str
    equipment_type: Optional[str] = None
    source: str
    total_amount: Optional[float] = None
    commission_amount: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    city: Optional[CityOut] = None
    partner: Optional[PartnerOut] = None
    model_config = {"from_attributes": True}


class RequestOut(RequestBase):
    id: int
    partner_id: Optional[int] = None
    status: str
    total_amount: Optional[float] = None
    commission_amount: Optional[float] = None
    partner_comment: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    city: Optional[CityOut] = None
    partner: Optional[PartnerOut] = None
    status_logs: List[StatusLogOut] = []
    spare_parts: List[SparePartOut] = []
    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    name: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class DashboardStats(BaseModel):
    total_today: int
    total_active: int
    by_status: dict
    recent_requests: List[RequestListOut]
    commission_this_month: float
