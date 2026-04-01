'use client';

/**
 * Admin authentication — client-side role-based auth for static export.
 *
 * Uses SHA-256 hashed passphrase stored in localStorage.
 * Roles: 'admin' | 'viewer' (viewer is default for all users).
 * Session expires after 24 hours of inactivity.
 *
 * Admin sets a passphrase on first use, then authenticates with it.
 * The passphrase hash is stored — never the plaintext.
 */

const AUTH_KEY = 'mushaf-admin-auth';
const SESSION_KEY = 'mushaf-admin-session';
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export type Role = 'admin' | 'viewer';

export interface AdminSession {
  role: Role;
  authenticatedAt: string;
  expiresAt: string;
}

// ─── SHA-256 hashing ──────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Passphrase management ────────────────────────────────────

export function isAdminConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(AUTH_KEY);
}

export async function setupAdmin(passphrase: string): Promise<boolean> {
  if (passphrase.length < 6) return false;
  const hash = await sha256(passphrase);
  localStorage.setItem(AUTH_KEY, hash);
  return true;
}

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  const storedHash = localStorage.getItem(AUTH_KEY);
  if (!storedHash) return false;
  const hash = await sha256(passphrase);
  // Constant-time comparison to prevent timing attacks
  if (hash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

export async function changePassphrase(oldPass: string, newPass: string): Promise<boolean> {
  if (newPass.length < 6) return false;
  const valid = await verifyPassphrase(oldPass);
  if (!valid) return false;
  return setupAdmin(newPass);
}

// ─── Session management ───────────────────────────────────────

export async function login(passphrase: string): Promise<AdminSession | null> {
  const valid = await verifyPassphrase(passphrase);
  if (!valid) return null;

  const now = new Date();
  const session: AdminSession = {
    role: 'admin',
    authenticatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL).toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isAdmin(): boolean {
  const session = getSession();
  return session?.role === 'admin';
}

export function refreshSession(): void {
  const session = getSession();
  if (!session) return;
  session.expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
