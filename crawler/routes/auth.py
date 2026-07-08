from fastapi import APIRouter, Depends, HTTPException, status
from prisma import Prisma
from schemas import AuthRequest
import auth as auth_utils
import database as db_mod

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: AuthRequest):
    email = request.email.strip().lower()
    password = request.password.strip()

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email và mật khẩu không được để trống")

    existing_user = await db_mod.client.user.find_unique(where={"email": email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã tồn tại")

    password_hash = auth_utils.hash_password(password)
    await db_mod.client.user.create(
        data={
            "email": email,
            "password_hash": password_hash,
        }
    )

    return {"success": True, "data": {"email": email}}


@router.post("/login")
async def login(request: AuthRequest):
    email = request.email.strip().lower()
    password = request.password.strip()

    if not email or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email và mật khẩu không được để trống")

    user = await db_mod.client.user.find_unique(where={"email": email})
    if not user or not auth_utils.verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng")

    token = auth_utils.create_access_token(email)
    return {
        "success": True,
        "data": {
            "token": token,
            "user": {
                "email": user["email"],
                "name": user.get("name") or "",
            },
        },
    }


@router.get("/me")
async def me(current_email: str = Depends(auth_utils.get_current_user_email)):
    user = await db_mod.client.user.find_unique(where={"email": current_email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User không tồn tại")

    return {
        "success": True,
        "data": {
            "email": user["email"],
            "name": user.get("name") or "",
        },
    }
