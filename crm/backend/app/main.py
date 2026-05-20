from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import requests, partners, cities, stats

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Repair CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(partners.router, prefix="/api/partners", tags=["partners"])
app.include_router(cities.router, prefix="/api/cities", tags=["cities"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
