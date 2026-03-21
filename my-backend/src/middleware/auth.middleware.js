const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { verifyAccessToken } = require("../utils/tokens");

const requireAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Authorization token is required");
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new ApiError(401, "Invalid access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "User no longer exists");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Access token expired"));
    }

    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      return next(new ApiError(401, "Invalid access token"));
    }

    next(error);
  }
};

module.exports = {
  requireAuth,
};
