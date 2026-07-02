const crypto = require("crypto");
const ApiError = require("./api-error");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

const getKey = () => {
  const raw = process.env.GITHUB_TOKEN_ENC_KEY;

  if (!raw) {
    throw new Error("GITHUB_TOKEN_ENC_KEY is not configured");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error("GITHUB_TOKEN_ENC_KEY must decode to 32 bytes");
  }

  return key;
};

const encryptSecret = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
};

const decryptSecret = (payload) => {
  const parts = String(payload || "").split(":");

  if (parts.length !== 3) {
    throw new ApiError(500, "Stored secret is malformed");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch (error) {
    throw new ApiError(500, "Unable to decrypt stored secret");
  }
};

const computeBlobSha = (content) => {
  const buffer = Buffer.from(content ?? "", "utf8");
  const header = `blob ${buffer.length}\0`;

  return crypto
    .createHash("sha1")
    .update(Buffer.concat([Buffer.from(header, "utf8"), buffer]))
    .digest("hex");
};

module.exports = {
  encryptSecret,
  decryptSecret,
  computeBlobSha,
};
