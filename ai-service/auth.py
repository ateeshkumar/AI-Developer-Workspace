import jwt

from config import JWT_SECRET


class AuthError(RuntimeError):
    pass


def verify_access_token(token: str) -> dict:
    if not JWT_SECRET:
        raise AuthError("JWT_SECRET is not configured on the AI service")

    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError as error:
        raise AuthError("Invalid or expired token") from error
