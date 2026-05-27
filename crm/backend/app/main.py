from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import requests, partners, cities, stats, auth
from .auth import get_current_user

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Repair CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

protected = {"dependencies": [Depends(get_current_user)]}
app.include_router(requests.router, prefix="/api/requests", tags=["requests"], **protected)
app.include_router(partners.router, prefix="/api/partners", tags=["partners"], **protected)
app.include_router(cities.router, prefix="/api/cities", tags=["cities"], **protected)
app.include_router(stats.router, prefix="/api/stats", tags=["stats"], **protected)


@app.get("/api/health")
def health():
    return {"status": "ok"}
