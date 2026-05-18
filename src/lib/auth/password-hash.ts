import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DEFAULT_N = 16384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LENGTH = 64;

export function hashPassword(plainText: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plainText, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
  }).toString("hex");
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt}$${derived}`;
}

export function verifyPassword(plainText: string, encodedHash: string): boolean {
  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nText, rText, pText, salt, expectedHex] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !expectedHex) return false;
  const actual = scryptSync(plainText, salt, expectedHex.length / 2, { N: n, r, p });
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
