
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
    "/favicon.ico",
]

# Common read-only endpoints we allow public access to so readers don't need to login
# These are intentionally permissive for GET/read operations used by the public UI.
PUBLIC_PATHS += [
    "/books",
    "/chapters",
    "/get-chapter-content",
    "/get-chapters",
    "/stream-chapter-audio",
    "/get-qidian-rank",
    # Google OAuth callback must be public because Google calls it without Authorization header
    "/crawl/youtube/callback",
]


def is_public_path(path: str) -> bool:
    if not path:
        return True
    for p in PUBLIC_PATHS:
        # root should only match exactly '/'
        if p == "/":
            if path == "/":
                return True
            continue
        # If the configured public path ends with '/', allow any prefix match
        if p.endswith("/"):
            if path.startswith(p):
                return True
            continue

        # Otherwise allow exact match or prefix followed by a slash (to avoid '/books123' matching '/books')
        if path == p or path.startswith(p + "/"):
            return True
    return False


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
