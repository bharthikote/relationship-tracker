import type { Profile } from "@prisma/client";
import { prisma } from "./db.js";

export async function isConnected(userAId: string, userBId: string): Promise<boolean> {
  if (userAId === userBId) return true;
  const rel = await prisma.connectionRequest.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: userAId, toUserId: userBId },
        { fromUserId: userBId, toUserId: userAId },
      ],
    },
  });
  return !!rel;
}

// Owner ids of every tree a given profile is allowed to *view* (their own,
// any open tree, and any private tree they have an accepted connection to).
export async function visibleOwnerIds(profile: Profile): Promise<string[] | "all"> {
  if (profile.role === "super_admin") return "all";

  const [openOwners, connections] = await Promise.all([
    prisma.profile.findMany({ where: { treeVisibility: "open" }, select: { id: true } }),
    prisma.connectionRequest.findMany({
      where: {
        status: "accepted",
        OR: [{ fromUserId: profile.id }, { toUserId: profile.id }],
      },
      select: { fromUserId: true, toUserId: true },
    }),
  ]);

  const ids = new Set<string>([profile.id]);
  for (const o of openOwners) ids.add(o.id);
  for (const c of connections) {
    ids.add(c.fromUserId);
    ids.add(c.toUserId);
  }
  return [...ids];
}

export async function canView(profile: Profile, ownerId: string): Promise<boolean> {
  if (profile.role === "super_admin" || profile.id === ownerId) return true;
  const owner = await prisma.profile.findUnique({ where: { id: ownerId } });
  if (!owner) return false;
  if (owner.treeVisibility === "open") return true;
  return isConnected(profile.id, ownerId);
}

// Whether `profile` may create a relationship touching people owned by `ownerId`
// (their own tree always; someone else's only with an accepted connection).
export async function canEditOwner(profile: Profile, ownerId: string): Promise<boolean> {
  if (profile.role === "super_admin" || profile.id === ownerId) return true;
  return isConnected(profile.id, ownerId);
}
