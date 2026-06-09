import { AuthConfig } from "./types";

const AUTH_URL = "http://4.224.186.213/evaluation-service/auth";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getAuthToken(config: AuthConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);


  if (cachedToken && now < tokenExpiresAt - 30) {
    return cachedToken;
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = data.expires_in;

  return cachedToken!;
}