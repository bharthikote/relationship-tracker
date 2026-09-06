import express from "express";
import cors from "cors";
import { prisma } from "./db.js";
import { requireAuth, requireAdmin } from "./authMiddleware.js";
import { canView, canEditOwner, visibleOwnerIds } from "./authorization.js";
import type { Person as DbPerson, Relationship as DbRelationship, Profile } from "@prisma/client";
import type { Person, Relationship, RelationshipType } from "./types.js";
import { findPath, captionFor } from "./pathfinder.js";

const app = express();
app.use(cors());
app.use(express.json());

// The DB enum can't contain a hyphen, so it stores "parent_child"; the wire format
// (and the rest of this codebase) uses "parent-child" for consistency with spouse/sibling.
function toApiRelationshipType(t: string): RelationshipType {
  return t === "parent_child" ? "parent-child" : (t as RelationshipType);
}
function toDbRelationshipType(t: RelationshipType): "spouse" | "parent_child" | "sibling" {
  return t === "parent-child" ? "parent_child" : t;
}
function toApiRelationship(r: DbRelationship): Relationship {
  return {
    id: r.id,
    type: toApiRelationshipType(r.type),
    personAId: r.personAId,
    personBId: r.personBId,
    marriageDate: r.marriageDate ?? undefined,
    isConsanguineous: r.isConsanguineous,
    createdAt: r.createdAt.toISOString(),
  };
}
function toApiPerson(p: DbPerson): Person {
  return {
    id: p.id,
    ownerId: p.ownerId,
    name: p.name,
    nameLocal: p.nameLocal ?? undefined,
    gender: p.gender,
    dob: p.dob ?? undefined,
    isDeceased: p.isDeceased,
    photoUrl: p.photoUrl ?? undefined,
    caste: p.caste ?? undefined,
    subcaste: p.subcaste ?? undefined,
    nativeVillageId: p.nativeVillageId ?? undefined,
    currentVillageId: p.currentVillageId ?? undefined,
    locationHistory: (p.locationHistory as unknown as Person["locationHistory"]) ?? [],
    addedBy: p.addedBy ?? undefined,
    lastEditedBy: p.lastEditedBy ?? undefined,
    verified: p.verified,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
function toApiProfile(p: Profile) {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName ?? undefined,
    role: p.role,
    treeVisibility: p.treeVisibility,
    createdAt: p.createdAt.toISOString(),
  };
}

function personSummary(p: DbPerson) {
  return { id: p.id, name: p.name, gender: p.gender, isDeceased: p.isDeceased, ownerId: p.ownerId };
}

async function relationsFor(personId: string) {
  const rels = await prisma.relationship.findMany({
    where: { OR: [{ personAId: personId }, { personBId: personId }] },
  });
  const otherIds = rels.map((r) => (r.personAId === personId ? r.personBId : r.personAId));
  const others = await prisma.person.findMany({ where: { id: { in: otherIds } } });
  const byId = new Map(others.map((p) => [p.id, p]));

  const spouses: ReturnType<typeof personSummary>[] = [];
  const parents: ReturnType<typeof personSummary>[] = [];
  const children: ReturnType<typeof personSummary>[] = [];
  const siblings: ReturnType<typeof personSummary>[] = [];

  for (const r of rels) {
    const otherId = r.personAId === personId ? r.personBId : r.personAId;
    const other = byId.get(otherId);
    if (!other) continue;
    if (r.type === "spouse") spouses.push(personSummary(other));
    else if (r.type === "sibling") siblings.push(personSummary(other));
    else if (r.type === "parent_child") {
      if (r.personAId === personId) children.push(personSummary(other));
      else parents.push(personSummary(other));
    }
  }
  return { spouses, parents, children, siblings };
}

// Every route below requires a signed-in Supabase user.
app.use("/api", requireAuth);

// ---- Profile ----
app.get("/api/profile/me", async (req, res) => {
  res.json(toApiProfile(req.profile!));
});

app.patch("/api/profile/me", async (req, res) => {
  const { displayName, treeVisibility } = req.body ?? {};
  if (treeVisibility && !["open", "private"].includes(treeVisibility)) {
    return res.status(400).json({ error: "treeVisibility must be 'open' or 'private'" });
  }
  const updated = await prisma.profile.update({
    where: { id: req.profile!.id },
    data: {
      ...(displayName !== undefined ? { displayName: displayName.trim() || null } : {}),
      ...(treeVisibility ? { treeVisibility } : {}),
    },
  });
  res.json(toApiProfile(updated));
});

// ---- Discover / connections ----
app.get("/api/discover", async (req, res) => {
  const openProfiles = await prisma.profile.findMany({
    where: { treeVisibility: "open", id: { not: req.profile!.id } },
    select: { id: true, displayName: true, email: true, _count: { select: { people: true } } },
  });
  res.json(
    openProfiles.map((p) => ({
      id: p.id,
      displayName: p.displayName || p.email,
      personCount: p._count.people,
    }))
  );
});

app.get("/api/users/search", async (req, res) => {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email) return res.json([]);
  const match = await prisma.profile.findUnique({ where: { email } });
  if (!match || match.id === req.profile!.id) return res.json([]);
  res.json([{ id: match.id, displayName: match.displayName || match.email }]);
});

app.get("/api/connections", async (req, res) => {
  const me = req.profile!.id;
  const requests = await prisma.connectionRequest.findMany({
    where: { OR: [{ fromUserId: me }, { toUserId: me }] },
    include: {
      fromUser: { select: { id: true, displayName: true, email: true } },
      toUser: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(
    requests.map((r) => ({
      id: r.id,
      status: r.status,
      message: r.message ?? undefined,
      direction: r.fromUserId === me ? "outgoing" : "incoming",
      fromUser: { id: r.fromUser.id, displayName: r.fromUser.displayName || r.fromUser.email },
      toUser: { id: r.toUser.id, displayName: r.toUser.displayName || r.toUser.email },
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

app.post("/api/connections", async (req, res) => {
  const { toUserId, message } = req.body ?? {};
  const me = req.profile!.id;
  if (!toUserId || toUserId === me) return res.status(400).json({ error: "invalid toUserId" });
  const target = await prisma.profile.findUnique({ where: { id: toUserId } });
  if (!target) return res.status(404).json({ error: "user not found" });

  const existing = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        { fromUserId: me, toUserId },
        { fromUserId: toUserId, toUserId: me },
      ],
    },
  });
  if (existing) return res.status(409).json({ error: "a connection request already exists", status: existing.status });

  const created = await prisma.connectionRequest.create({
    data: { fromUserId: me, toUserId, message },
  });
  res.status(201).json(created);
});

app.post("/api/connections/:id/accept", async (req, res) => {
  const reqRow = await prisma.connectionRequest.findUnique({ where: { id: req.params.id } });
  if (!reqRow || reqRow.toUserId !== req.profile!.id) return res.status(404).json({ error: "not found" });
  const updated = await prisma.connectionRequest.update({
    where: { id: reqRow.id },
    data: { status: "accepted", respondedAt: new Date() },
  });
  res.json(updated);
});

app.post("/api/connections/:id/decline", async (req, res) => {
  const reqRow = await prisma.connectionRequest.findUnique({ where: { id: req.params.id } });
  if (!reqRow || reqRow.toUserId !== req.profile!.id) return res.status(404).json({ error: "not found" });
  const updated = await prisma.connectionRequest.update({
    where: { id: reqRow.id },
    data: { status: "declined", respondedAt: new Date() },
  });
  res.json(updated);
});

app.delete("/api/connections/:id", async (req, res) => {
  const me = req.profile!.id;
  const reqRow = await prisma.connectionRequest.findUnique({ where: { id: req.params.id } });
  if (!reqRow || (reqRow.fromUserId !== me && reqRow.toUserId !== me)) {
    return res.status(404).json({ error: "not found" });
  }
  await prisma.connectionRequest.delete({ where: { id: reqRow.id } });
  res.status(204).end();
});

// ---- Admin ----
app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const profiles = await prisma.profile.findMany({
    include: { _count: { select: { people: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(
    profiles.map((p) => ({
      ...toApiProfile(p),
      personCount: p._count.people,
    }))
  );
});

// ---- Villages (shared reference data, not owned) ----
app.get("/api/villages", async (_req, res) => {
  const villages = await prisma.village.findMany();
  res.json(villages);
});

app.post("/api/villages", async (req, res) => {
  const { name, type = "village", color, region } = req.body ?? {};
  if (!name || !color) return res.status(400).json({ error: "name and color are required" });
  const v = await prisma.village.create({ data: { name, type, color, region } });
  res.status(201).json(v);
});

// ---- People ----
app.get("/api/people", async (req, res) => {
  const owners = await visibleOwnerIds(req.profile!);
  const q = String(req.query.q ?? "").trim();
  const villageId = req.query.villageId as string | undefined;
  const people = await prisma.person.findMany({
    where: {
      ...(owners === "all" ? {} : { ownerId: { in: owners } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { nameLocal: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(villageId ? { currentVillageId: villageId } : {}),
    },
  });
  res.json(people.map(toApiPerson));
});

app.get("/api/people/:id", async (req, res) => {
  const p = await prisma.person.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: "not found" });
  if (!(await canView(req.profile!, p.ownerId))) return res.status(403).json({ error: "not visible to you" });
  res.json({ ...toApiPerson(p), relations: await relationsFor(p.id) });
});

app.post("/api/people", async (req, res) => {
  const body = req.body ?? {};
  const { name, gender, attachTo } = body;
  if (!name || !gender) return res.status(400).json({ error: "name and gender are required" });
  const me = req.profile!.id;

  const isFirstOfMine = (await prisma.person.count({ where: { ownerId: me } })) === 0;
  if (!isFirstOfMine && !attachTo?.personId) {
    return res
      .status(400)
      .json({ error: "New people must be attached to an existing person (attachTo.personId)" });
  }

  let anchor: DbPerson | null = null;
  if (attachTo?.personId) {
    anchor = await prisma.person.findUnique({ where: { id: attachTo.personId } });
    if (!anchor) return res.status(400).json({ error: "attachTo.personId not found" });
    if (!(await canEditOwner(req.profile!, anchor.ownerId))) {
      return res.status(403).json({ error: "you don't have permission to add relatives here" });
    }
  }

  const newPerson = await prisma.person.create({
    data: {
      ownerId: me,
      name,
      nameLocal: body.nameLocal,
      gender,
      dob: body.dob,
      isDeceased: !!body.isDeceased,
      photoUrl: body.photoUrl,
      caste: body.caste,
      subcaste: body.subcaste,
      nativeVillageId: body.nativeVillageId,
      currentVillageId: body.currentVillageId ?? body.nativeVillageId,
      locationHistory: body.locationHistory ?? [],
      addedBy: me,
      lastEditedBy: me,
      verified: false,
    },
  });

  let relationship: Relationship | null = null;
  if (anchor && attachTo?.relationType) {
    const [type, personAId, personBId] = relationDirection(attachTo.relationType, anchor.id, newPerson.id);
    const created = await prisma.relationship.create({
      data: {
        type: toDbRelationshipType(type),
        personAId,
        personBId,
        marriageDate: body.marriageDate,
        isConsanguineous: !!body.isConsanguineous,
      },
    });
    relationship = toApiRelationship(created);
  }

  res.status(201).json({ person: toApiPerson(newPerson), relationship });
});

app.patch("/api/people/:id", async (req, res) => {
  const person = await prisma.person.findUnique({ where: { id: req.params.id } });
  if (!person) return res.status(404).json({ error: "not found" });
  if (!(await canEditOwner(req.profile!, person.ownerId))) {
    return res.status(403).json({ error: "you don't have permission to edit this person" });
  }

  const body = req.body ?? {};
  const editable = [
    "name",
    "nameLocal",
    "dob",
    "isDeceased",
    "caste",
    "subcaste",
    "nativeVillageId",
    "currentVillageId",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const key of editable) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "no editable fields provided" });

  const updated = await prisma.person.update({
    where: { id: person.id },
    data: { ...data, lastEditedBy: req.profile!.id },
  });
  res.json(toApiPerson(updated));
});

function relationDirection(
  relationType: "spouse" | "child" | "parent" | "sibling",
  anchorId: string,
  newId: string
): [RelationshipType, string, string] {
  switch (relationType) {
    case "spouse":
      return ["spouse", anchorId, newId];
    case "child":
      return ["parent-child", anchorId, newId];
    case "parent":
      return ["parent-child", newId, anchorId];
    case "sibling":
      return ["sibling", anchorId, newId];
  }
}

// ---- Relationships ----
app.get("/api/relationships", async (req, res) => {
  const owners = await visibleOwnerIds(req.profile!);
  const rels = await prisma.relationship.findMany({
    where:
      owners === "all"
        ? {}
        : { personA: { ownerId: { in: owners } }, personB: { ownerId: { in: owners } } },
  });
  res.json(rels.map(toApiRelationship));
});

app.post("/api/relationships", async (req, res) => {
  const { type, personAId, personBId, marriageDate, isConsanguineous } = req.body ?? {};
  if (!type || !personAId || !personBId) {
    return res.status(400).json({ error: "type, personAId, personBId are required" });
  }
  const [personA, personB] = await Promise.all([
    prisma.person.findUnique({ where: { id: personAId } }),
    prisma.person.findUnique({ where: { id: personBId } }),
  ]);
  if (!personA || !personB) return res.status(400).json({ error: "unknown person id" });

  const me = req.profile!.id;
  const ownedByMe = personA.ownerId === me || personB.ownerId === me;
  if (!ownedByMe && req.profile!.role !== "super_admin") {
    return res.status(403).json({ error: "you must own one side of this relationship" });
  }
  for (const owner of new Set([personA.ownerId, personB.ownerId])) {
    if (!(await canEditOwner(req.profile!, owner))) {
      return res.status(403).json({ error: "you're not connected to one of these people's trees" });
    }
  }

  const rel = await prisma.relationship.create({
    data: {
      type: toDbRelationshipType(type),
      personAId,
      personBId,
      marriageDate,
      isConsanguineous: !!isConsanguineous,
    },
  });
  res.status(201).json(toApiRelationship(rel));
});

// ---- Duplicate detection ----
app.get("/api/duplicates", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (!name) return res.json([]);
  const owners = await visibleOwnerIds(req.profile!);
  const matches = await prisma.person.findMany({
    where: {
      name: { contains: name, mode: "insensitive" },
      ...(owners === "all" ? {} : { ownerId: { in: owners } }),
    },
    take: 10,
  });
  res.json(matches.map(personSummary));
});

// ---- Relationship path finder ----
app.get("/api/path", async (req, res) => {
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const [fromPerson, toPerson] = await Promise.all([
    prisma.person.findUnique({ where: { id: from } }),
    prisma.person.findUnique({ where: { id: to } }),
  ]);
  if (!fromPerson || !toPerson) return res.status(404).json({ error: "person not found" });
  if (!(await canView(req.profile!, fromPerson.ownerId)) || !(await canView(req.profile!, toPerson.ownerId))) {
    return res.status(403).json({ error: "not visible to you" });
  }

  const owners = await visibleOwnerIds(req.profile!);
  const [people, relationships] = await Promise.all([
    prisma.person.findMany({ where: owners === "all" ? {} : { ownerId: { in: owners } } }),
    prisma.relationship.findMany({
      where:
        owners === "all"
          ? {}
          : { personA: { ownerId: { in: owners } }, personB: { ownerId: { in: owners } } },
    }),
  ]);

  const steps = findPath(from, to, people.map(toApiPerson), relationships.map(toApiRelationship));
  if (steps === null) return res.json({ connected: false, steps: [], caption: "No known connection yet." });

  const caption = captionFor(steps, toPerson.name);
  res.json({ connected: true, steps, caption });
});

const PORT = Number(process.env.PORT ?? 4001);
app.listen(PORT, () => {
  console.log(`Relationship Tracker API listening on http://localhost:${PORT}`);
});
