import { AccessToken } from "livekit-server-sdk";

export type ConnectionDetails = {
  serverUrl: string;
  token: string;
};

const requiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const resolveServerUrl = (): string => {
  const url = process.env.LIVEKIT_WS_URL ?? process.env.LIVEKIT_URL;
  if (!url) {
    throw new Error("Missing LIVEKIT_WS_URL (preferred) or LIVEKIT_URL");
  }
  return url;
};

export const buildConnectionDetails = async ({
  room,
  identity,
  ttlSeconds = 3600,
}: {
  room: string;
  identity: string;
  ttlSeconds?: number;
}): Promise<ConnectionDetails> => {
  const trimmedRoom = room?.trim();
  const trimmedIdentity = identity?.trim();

  if (!trimmedRoom || !trimmedIdentity) {
    throw new Error("room and identity are required");
  }

  const apiKey = requiredEnv("LIVEKIT_API_KEY");
  const apiSecret = requiredEnv("LIVEKIT_API_SECRET");
  const serverUrl = resolveServerUrl();

  const token = new AccessToken(apiKey, apiSecret, {
    identity: trimmedIdentity,
    ttl: ttlSeconds,
  });

  token.addGrant({
    room: trimmedRoom,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    serverUrl,
  };
};
