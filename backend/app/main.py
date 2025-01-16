from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, zipcode
from .database import engine
from . import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ZIP Code Management API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(zipcode.router)

@app.get("/")
async def root():
    return {"message": "Welcome to ZIP Code Management API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 