import type { NextFunction, Request, Response } from "express";
import type { Profile } from "@prisma/client";
import { supabaseAdmin } from "./supabase.js";
import { prisma } from "./db.js";

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

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Invalid or expired session" });
  if (!data.user.email) return res.status(401).json({ error: "Account has no email" });

  req.profile = await getOrCreateProfile(data.user.id, data.user.email);
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.profile?.role !== "super_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
