"""
FieldOpt Main API Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database.connection import init_db
from backend.api.routes import technicians, jobs, assignments, routing

settings = get_settings()

app = FastAPI(
	title=settings.APP_NAME,
	description="Open-source field service management system",
	version=settings.APP_VERSION,
	docs_url="/docs",
	redoc_url="/redoc"
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
	init_db()
	print(f"{settings.APP_NAME} v{settings.APP_VERSION} started")
	print(f"API Documentation: http://localhost:8000/docs")

@app.on_event("shutdown")
async def shutdown_event():
	print(f"{settings.APP_NAME} shutting down")

@app.get("/")
def root():
	return {
		"message": f"Welcome to {settings.APP_NAME} API",
		"version": settings.APP_VERSION,
		"docs": "/docs",
		"status": "operational"
	}

@app.get("/health")
def health_check():
	return {
		"status": "healthy",
		"version": settings.APP_VERSION
	}

# Routers
app.include_router(
	technicians.router,
	prefix=f"{settings.API_V1_PREFIX}/technicians",
	tags=["Technicians"]
)

app.include_router(
	jobs.router,
	prefix=f"{settings.API_V1_PREFIX}/jobs",
	tags=["Jobs"]
)

app.include_router(
	assignments.router,
	prefix=f"{settings.API_V1_PREFIX}/assignments",
	tags=["Assignments"]
)

app.include_router(
	routing.router,
	prefix=f"{settings.API_V1_PREFIX}/routing",
	tags=["Routing"]
)

if __name__ == "__main__":
	import uvicorn
	uvicorn.run(
		"backend.api.main:app",
		host=settings.API_HOST,
		port=settings.API_PORT,
		reload=settings.API_RELOAD
	)
