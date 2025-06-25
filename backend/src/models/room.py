from pydantic import BaseModel

class Room(BaseModel):
    name: str
    code: str = "# Welcome to the collaborative Python editor!\nprint('Hello, World!')"

class CodeUpdate(BaseModel):
    code: str

class ExecuteCode(BaseModel):
    code: str 