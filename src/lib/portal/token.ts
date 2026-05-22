/**
 * Signed portal tokens for the public client portal.
 *
 * Format: base64url(`${clientId}.${hmacHex}`)
 *
 * The HMAC uses PORTAL_TOKEN_SECRET (falls back to AUTH_SECRET for
 * convenience in monorepo setups) so the clientId is never exposed raw in
 * the URL.
 */

function getSecret(): string {
  return process.env.PORTAL_TOKEN_SECRET ?? process.env.AUTH_SECRET ?? "rms-portal-dev-secret-change-me";
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (padded.length % 4);
  return Buffer.from(pad < 4 ? padded + "=".repeat(pad) : padded, "base64").toString("utf8");
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generates a signed, opaque token from a clientId. */
export async function signPortalToken(clientId: string): Promise<string> {
  const secret = getSecret();
  const mac = await hmac(clientId, secret);
  return base64url(`${clientId}.${mac}`);
}

/**
 * Verifies the token and returns the clientId, or null if invalid.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPortalToken(token: string): Promise<string | null> {
  try {
    const decoded = base64urlDecode(token);
    const dotIndex = decoded.lastIndexOf(".");
    if (dotIndex < 0) return null;
    const clientId = decoded.slice(0, dotIndex);
    const receivedMac = decoded.slice(dotIndex + 1);
    const expectedMac = await hmac(clientId, getSecret());
    if (receivedMac.length !== expectedMac.length) return null;
    let diff = 0;
    for (let i = 0; i < expectedMac.length; i++) {
      diff |= receivedMac.charCodeAt(i) ^ expectedMac.charCodeAt(i);
    }
    return diff === 0 ? clientId : null;
  } catch {
    return null;
  }
}
