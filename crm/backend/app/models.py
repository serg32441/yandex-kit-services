from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class City(Base):
    __tablename__ = "cities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    partners = relationship("Partner", back_populates="city")
    requests = relationship("Request", back_populates="city")


class Partner(Base):
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    telegram_id = Column(String(50), unique=True, nullable=True)
    telegram_username = Column(String(100), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    city = relationship("City", back_populates="partners")
    requests = relationship("Request", back_populates="partner")


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(200), nullable=False)
    client_phone = Column(String(20), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True)
    equipment_type = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    # Statuses: new | transferred | in_progress | waiting_parts | parts_sent | done | closed
    status = Column(String(50), default="new", nullable=False)
    source = Column(String(50), default="avito")
    total_amount = Column(Float, nullable=True)
    commission_amount = Column(Float, nullable=True)
    partner_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    city = relationship("City", back_populates="requests")
    partner = relationship("Partner", back_populates="requests")
    status_logs = relationship(
        "StatusLog", back_populates="request", order_by="StatusLog.id"
    )
    spare_parts = relationship("SparePartRequest", back_populates="request")


class StatusLog(Base):
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    status = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)
    changed_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("Request", back_populates="status_logs")


class SparePartRequest(Base):
    __tablename__ = "spare_part_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    part_name = Column(String(300), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=True)
    # Statuses: requested | confirmed | sent
    status = Column(String(50), default="requested")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    request = relationship("Request", back_populates="spare_parts")
