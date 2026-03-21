const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

const getAccessSecret = () => process.env.JWT_SECRET;
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

const ensureSecrets = () => {
  if (!getAccessSecret()) {
    throw new Error("JWT_SECRET is not configured");
  }
};

const signAccessToken = (user) => {
  ensureSecrets();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: "access",
      jti: crypto.randomUUID(),
    },
    getAccessSecret(),
    { expiresIn: ACCESS_TOKEN_TTL }
  );
};

const signRefreshToken = (user) => {
  ensureSecrets();

  return jwt.sign(
    { sub: user.id, type: "refresh", jti: crypto.randomUUID() },
    getRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL }
  );
};

const verifyAccessToken = (token) =>
  jwt.verify(token, getAccessSecret(), { algorithms: ["HS256"] });

const verifyRefreshToken = (token) =>
  jwt.verify(token, getRefreshSecret(), { algorithms: ["HS256"] });

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
