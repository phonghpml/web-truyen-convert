
# Public paths that do not require Authorization header.
# Minimal whitelist: keep only static assets, docs, and auth endpoints
PUBLIC_PATHS = [
    "/",
    "/auth/login",
    "/auth/register",
    # keep refresh public so client can get an access token from HttpOnly cookie
    "/auth/refresh",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/static",
    "/novnc",
    "/favicon.ico",
    "/crawl/captcha/desktop",
]

# Common read-only endpoints we allow public access to so readers don't need to login
# These are intentionally permissive for GET/read operations used by the public UI.
PUBLIC_PATHS += [
    "/books",
    "/books/search",
    "/chapters",
    "/get-chapter-content",
    "/get-chapters",
    "/stream-chapter-audio",
    "/get-qidian-rank",
    # Google OAuth callback must be public because Google calls it without Authorization header
    "/crawl/youtube/callback",
]

PUBLIC_PATH_PREFIXES = (
    "/docs/",
    "/redoc/",
    "/static/",
    "/novnc/",
)


def is_public_path(path: str) -> bool:
    if not path:
        return True
    return path in PUBLIC_PATHS or any(path.startswith(prefix) for prefix in PUBLIC_PATH_PREFIXES)


async def enforce_auth_middleware(request, call_next):
    # Allow preflight and whitelisted paths
    if request.method == "OPTIONS" or is_public_path(request.url.path):
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        from fastapi.responses import JSONResponse
        return JSONResponse({"success": False, "detail": "Authentication required"}, status_code=401)

    token = auth_header.split(" ", 1)[1].strip()
    try:
        # verify_access_token raises HTTPException on invalid/expired tokens
        # Import auth utilities lazily to avoid importing FastAPI at module import time
        import auth as auth_utils
        auth_utils.verify_access_token(token)
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse({"success": False, "detail": "Invalid or expired token"}, status_code=401)

    return await call_next(request)
