from fastapi import APIRouter

from ..interfaces.mapper import Mapper
from ..services.char_replacer import CharReplacer
from .schemas import (
    DefaultAlphabetResponse,
    MapperInfo,
    ReplaceRequest,
    ReplaceResponse,
)


def create_mapping_router(
    name: str,
    mapper: type[Mapper],
    shown_name: str,
    description: str
) -> APIRouter:
    """
    Create routers for Mapper
    """
    router = APIRouter(prefix=f"/{name}", tags=[name])

    @router.get(
        "/",
        response_model=MapperInfo
    )
    def about() -> MapperInfo:
        return MapperInfo(
            name=name,
            shown_name=shown_name,
            description=description
        )

    @router.post(
        "/replace",
        response_model=ReplaceResponse
    )
    def replace(request: ReplaceRequest) -> ReplaceResponse:
        table = mapper.get_mapping(request.alphabet)
        result = CharReplacer.replace(request.text, table)

        return ReplaceResponse(result=result)

    @router.get(
        "/default-alphabet",
        response_model=DefaultAlphabetResponse
    )
    def default_alphabet() -> DefaultAlphabetResponse:
        return DefaultAlphabetResponse(
            default_alphabet = mapper.get_default_alphabet()
        )

    return router
