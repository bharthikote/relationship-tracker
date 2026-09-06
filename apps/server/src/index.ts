import express from "express";
import cors from "cors";
import { prisma } from "./db.js";
import type { Person as DbPerson, Relationship as DbRelationship } from "@prisma/client";
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
    name: p.name,
    nameLocal: p.nameLocal ?? undefined,
    gender: p.gender,
    dob: p.dob ?? undefined,
    isDeceased: p.isDeceased,
    photoUrl: p.photoUrl ?? undefined,
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

function personSummary(p: DbPerson) {
  return { id: p.id, name: p.name, gender: p.gender, isDeceased: p.isDeceased };
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

// ---- Villages ----
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
  const q = String(req.query.q ?? "").trim();
  const villageId = req.query.villageId as string | undefined;
  const people = await prisma.person.findMany({
    where: {
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
  res.json({ ...toApiPerson(p), relations: await relationsFor(p.id) });
});

app.post("/api/people", async (req, res) => {
  const body = req.body ?? {};
  const { name, gender, attachTo } = body;
  if (!name || !gender) return res.status(400).json({ error: "name and gender are required" });

  const isFirstPerson = (await prisma.person.count()) === 0;
  if (!isFirstPerson && !attachTo?.personId) {
    return res
      .status(400)
      .json({ error: "New people must be attached to an existing person (attachTo.personId)" });
  }
  if (!isFirstPerson) {
    const anchor = await prisma.person.findUnique({ where: { id: attachTo.personId } });
    if (!anchor) return res.status(400).json({ error: "attachTo.personId not found" });
  }

  const newPerson = await prisma.person.create({
    data: {
      name,
      nameLocal: body.nameLocal,
      gender,
      dob: body.dob,
      isDeceased: !!body.isDeceased,
      photoUrl: body.photoUrl,
      nativeVillageId: body.nativeVillageId,
      currentVillageId: body.currentVillageId ?? body.nativeVillageId,
      locationHistory: body.locationHistory ?? [],
      addedBy: body.addedBy,
      lastEditedBy: body.addedBy,
      verified: false,
    },
  });

  let relationship: Relationship | null = null;
  if (!isFirstPerson && attachTo?.personId && attachTo?.relationType) {
    const [type, personAId, personBId] = relationDirection(
      attachTo.relationType,
      attachTo.personId,
      newPerson.id
    );
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
app.get("/api/relationships", async (_req, res) => {
  const rels = await prisma.relationship.findMany();
  res.json(rels.map(toApiRelationship));
});

app.post("/api/relationships", async (req, res) => {
  const { type, personAId, personBId, marriageDate, isConsanguineous } = req.body ?? {};
  if (!type || !personAId || !personBId) {
    return res.status(400).json({ error: "type, personAId, personBId are required" });
  }
  const [aExists, bExists] = await Promise.all([
    prisma.person.findUnique({ where: { id: personAId } }),
    prisma.person.findUnique({ where: { id: personBId } }),
  ]);
  if (!aExists || !bExists) return res.status(400).json({ error: "unknown person id" });

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
  const matches = await prisma.person.findMany({
    where: { name: { contains: name, mode: "insensitive" } },
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

  const [people, relationships] = await Promise.all([
    prisma.person.findMany(),
    prisma.relationship.findMany(),
  ]);

  const steps = findPath(
    from,
    to,
    people.map(toApiPerson),
    relationships.map(toApiRelationship)
  );
  if (steps === null) return res.json({ connected: false, steps: [], caption: "No known connection yet." });

  const caption = captionFor(steps, toPerson.name);
  res.json({ connected: true, steps, caption });
});

const PORT = Number(process.env.PORT ?? 4001);
app.listen(PORT, () => {
  console.log(`Relationship Tracker API listening on http://localhost:${PORT}`);
});
