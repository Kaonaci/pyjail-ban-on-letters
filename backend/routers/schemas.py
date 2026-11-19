from pydantic import BaseModel


class ReplaceRequest(BaseModel):
    text: str
    alphabet: str | None = None

class ReplaceResponse(BaseModel):
    result: str

class DefaultAlphabetResponse(BaseModel):
    default_alphabet: str

class MapperInfo(BaseModel):
    name: str
    shown_name: str
    description: str