from pydantic import BaseModel, EmailStr
from typing import Optional


class TranslationRequest(BaseModel):
    url: str


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class UserHistoryRequest(BaseModel):
    book_url: str
    chapter_slug: str
    chapter_url: Optional[str]
    chapter_title: str


class UserLibraryRequest(BaseModel):
    book_url: str
    title_vi: str
    cover_url: Optional[str]
