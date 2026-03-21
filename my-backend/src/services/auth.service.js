const bcrypt = require("bcrypt");

const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { sanitizeUser } = require("../utils/auth-response");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../utils/tokens");

const SALT_ROUNDS = 10;

const buildAuthPayload = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const decodedRefreshToken = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

const register = async ({ name, email, password }) => {
  if (!name || !String(name).trim()) {
    throw new ApiError(400, "Name is required");
  }

  if (!email || !String(email).trim()) {
    throw new ApiError(400, "Email is required");
  }

  if (!password || String(password).length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ApiError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
    },
  });

  return buildAuthPayload(user);
};

const login = async ({ email, password }) => {
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password");
  }

  return buildAuthPayload(user);
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (_error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (payload.type !== "refresh") {
    throw new ApiError(401, "Invalid refresh token");
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token is expired or revoked");
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  return buildAuthPayload(storedToken.user);
};

const logout = async (refreshToken) => {
  if (!refreshToken) {
    return { success: true };
  }

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: hashToken(refreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return { success: true };
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
