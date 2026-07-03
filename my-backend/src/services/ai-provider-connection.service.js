const prisma = require("../config/prisma");
const ApiError = require("../utils/api-error");
const { encryptSecret, decryptSecret } = require("../utils/crypto");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const PROVIDERS = ["claude", "openai"];

const normalizeProvider = (provider) => {
  const value = String(provider || "").toLowerCase();

  if (!PROVIDERS.includes(value)) {
    throw new ApiError(400, `Unknown provider "${provider}"`);
  }

  return value;
};

const verifyKeyWithProvider = async (provider, apiKey) => {
  const response = await fetch(`${AI_SERVICE_URL}/ai/providers/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, api_key: apiKey }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.valid) {
    throw new ApiError(400, data.detail || `Could not verify the ${provider} API key`);
  }
};

const connect = async (userId, provider, apiKey) => {
  const normalized = normalizeProvider(provider);

  if (!apiKey || !String(apiKey).trim()) {
    throw new ApiError(400, "An API key is required");
  }

  const trimmedKey = String(apiKey).trim();
  await verifyKeyWithProvider(normalized, trimmedKey);

  const encryptedApiKey = encryptSecret(trimmedKey);

  const connection = await prisma.aiProviderConnection.upsert({
    where: { userId_provider: { userId, provider: normalized.toUpperCase() } },
    update: { encryptedApiKey },
    create: { userId, provider: normalized.toUpperCase(), encryptedApiKey },
  });

  return { provider: normalized, connected: true, connectedAt: connection.createdAt };
};

const getStatus = async (userId) => {
  const connections = await prisma.aiProviderConnection.findMany({ where: { userId } });
  const status = Object.fromEntries(PROVIDERS.map((provider) => [provider, { connected: false }]));

  for (const connection of connections) {
    status[connection.provider.toLowerCase()] = {
      connected: true,
      connectedAt: connection.createdAt,
    };
  }

  return status;
};

const disconnect = async (userId, provider) => {
  const normalized = normalizeProvider(provider);

  await prisma.aiProviderConnection.deleteMany({
    where: { userId, provider: normalized.toUpperCase() },
  });

  return { provider: normalized, connected: false };
};

const getDecryptedKey = async (userId, provider) => {
  const normalized = normalizeProvider(provider);

  const connection = await prisma.aiProviderConnection.findUnique({
    where: { userId_provider: { userId, provider: normalized.toUpperCase() } },
  });

  if (!connection) {
    return null;
  }

  return decryptSecret(connection.encryptedApiKey);
};

module.exports = {
  PROVIDERS,
  normalizeProvider,
  connect,
  getStatus,
  disconnect,
  getDecryptedKey,
};
