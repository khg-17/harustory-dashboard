import { cookies } from "next/headers";

// Environment variables or fallback default values
const ALLOWED_DOMAINS_ENV = process.env.ALLOWED_EMAIL_DOMAIN || "gurucompany.co.kr,avatye.com";
const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY || "guru-clickhouse-dashboard-secret-token-key-2026";
const COOKIE_NAME = "dashboard_session";

export interface AuthUser {
  email: string;
  domain: string;
  loginTime: number;
}

/**
 * Parses and returns list of allowed domains
 */
export function getAllowedDomains(): string[] {
  return ALLOWED_DOMAINS_ENV
    .replace(/["']/g, "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/**
 * Validates if an email's domain is in the allowed domains list
 */
export function validateEmailDomain(email: string): { isValid: boolean; domain: string; allowedDomains: string[] } {
  const allowed = getAllowedDomains();
  if (!email || !email.includes("@")) {
    return { isValid: false, domain: "", allowedDomains: allowed };
  }

  const parts = email.trim().toLowerCase().split("@");
  const domain = parts[parts.length - 1];

  const isValid = allowed.includes(domain);
  return { isValid, domain, allowedDomains: allowed };
}

/**
 * Simple Web Crypto HMAC-SHA256 Token Encryption/Decryption helper
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(AUTH_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Generates a signed session token for a user
 */
export async function createSessionToken(user: AuthUser): Promise<string> {
  const payloadStr = JSON.stringify(user);
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payloadStr));

  const payloadBase64 = Buffer.from(payloadStr).toString("base64url");
  const sigBase64 = Buffer.from(signature).toString("base64url");

  return `${payloadBase64}.${sigBase64}`;
}

/**
 * Verifies and parses a signed session token
 */
export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  if (!token || !token.includes(".")) return null;

  try {
    const [payloadBase64, sigBase64] = token.split(".");
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const signature = Buffer.from(sigBase64, "base64url");

    const enc = new TextEncoder();
    const key = await getCryptoKey();

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      enc.encode(payloadStr)
    );

    if (!isValid) return null;

    const user: AuthUser = JSON.parse(payloadStr);
    return user;
  } catch (e) {
    return null;
  }
}

/**
 * Gets currently authenticated user from cookies
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { COOKIE_NAME };
