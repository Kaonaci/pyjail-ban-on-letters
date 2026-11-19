from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import mapper_configs
from .routers.mapping import create_mapping_router
from .routers.schemas import MapperInfo

app = FastAPI(
    title="Character Replacement API",
    version="1.0.0"
)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

routers = [
    create_mapping_router(
        name=config["name"],
        mapper=config["mapper"],
        shown_name=config["shown_name"],
        description=config["description"],
    )
    for config in mapper_configs
]

mapper_catalog = [
    MapperInfo(
        name=config["name"],
        shown_name=config["shown_name"],
        description=config["description"],
    )
    for config in mapper_configs
]


for router in routers:
    app.include_router(router, prefix="/api/v1")


@app.get("/api/v1/mappers", response_model=list[MapperInfo])
async def get_mappers() -> list[MapperInfo]:
    return mapper_catalog


app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)

@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(FRONTEND_DIR / "index.html")