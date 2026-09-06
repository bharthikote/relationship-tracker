import type { NextFunction, Request, Response } from "express";
import type { Profile } from "@prisma/client";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { prisma } from "./db.js";

// Verify Supabase session tokens locally against a cached copy of the project's JWKS instead of
// either round-tripping to Supabase's Auth API per request (slow, and its admin.getUser(jwt) path
// throws an intermittent "Auth session missing!" under concurrent requests) or using jose's
// createRemoteJWKSet (which can fire a fresh network fetch per concurrent cache-miss -- this
// environment's outbound networking is flaky enough that concurrent fetches sometimes fail,
// causing real, valid tokens to be intermittently rejected). Fetching once and caching locally
// means verification after startup is pure local crypto with no network dependency at all.
const jwksUrl = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
let localJwks = createLocalJWKSet(await fetchJwks());

async function fetchJwks(): Promise<JSONWebKeySet> {
  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  return (await res.json()) as JSONWebKeySet;
}

// Refresh periodically in case Supabase rotates signing keys; keep the existing cache on failure.
setInterval(
  async () => {
    try {
      localJwks = createLocalJWKSet(await fetchJwks());
    } catch (err) {
      console.error("[auth] JWKS refresh failed, keeping previous keys:", err instanceof Error ? err.message : err);
    }
  },
  6 * 60 * 60 * 1000
).unref();

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      profile?: Profile;
    }
  }
}

async function getOrCreateProfile(userId: string, email: string): Promise<Profile> {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (existing) return existing;

  // Bootstrap: the very first person to sign up becomes super_admin.
  const isFirstEver = (await prisma.profile.count()) === 0;
  return prisma.profile.create({
    data: { id: userId, email, role: isFirstEver ? "super_admin" : "user" },
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  let payload;
  try {
    ({ payload } = await jwtVerify(token, localJwks, { issuer: `${process.env.SUPABASE_URL}/auth/v1` }));
  } catch (err) {
    console.error("[auth] token verification failed:", err instanceof Error ? err.message : err);
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const userId = payload.sub;
  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (!userId || !email) return res.status(401).json({ error: "Account has no email" });

  req.profile = await getOrCreateProfile(userId, email);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.profile?.role !== "super_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
