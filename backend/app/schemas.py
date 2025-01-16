from pydantic import BaseModel, EmailStr, constr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# ZIP code related schemas
class ZipCodeListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    zip_codes: List[constr(pattern=r'^\d{5}$')]  # Ensures 5-digit ZIP codes

class ZipCodeListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    zip_codes: Optional[List[constr(pattern=r'^\d{5}$')]] = None

class ZipCodeList(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    user_id: int
    zip_codes: List[str]
    matched_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ZipCodeComparison(BaseModel):
    added: List[str]
    removed: List[str]
    common: List[str]
    population_changes: Optional[Dict[str, Dict[str, Any]]] = None 

class FileUploadResponse(BaseModel):
    filename: str
    list_id: int
    total_zip_codes: int
    invalid_zip_codes: Optional[List[str]] = None
    
    class Config:
        from_attributes = True 