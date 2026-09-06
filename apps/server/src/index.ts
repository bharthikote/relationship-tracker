import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import type { Person, Relationship, Village } from "./types.js";
import { findPath, captionFor } from "./pathfinder.js";

const app = express();
app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();

function personSummary(p: Person) {
  return { id: p.id, name: p.name, gender: p.gender, isDeceased: p.isDeceased };
}

function relationsFor(personId: string) {
  const rels = db.data.relationships.filter(
    (r) => r.personAId === personId || r.personBId === personId
  );
  const spouses: ReturnType<typeof personSummary>[] = [];
  const parents: ReturnType<typeof personSummary>[] = [];
  const children: ReturnType<typeof personSummary>[] = [];
  const siblings: ReturnType<typeof personSummary>[] = [];
  const byId = new Map(db.data.people.map((p) => [p.id, p]));

  for (const r of rels) {
    const otherId = r.personAId === personId ? r.personBId : r.personAId;
    const other = byId.get(otherId);
    if (!other) continue;
    if (r.type === "spouse") spouses.push(personSummary(other));
    else if (r.type === "sibling") siblings.push(personSummary(other));
    else if (r.type === "parent-child") {
      if (r.personAId === personId) children.push(personSummary(other));
      else parents.push(personSummary(other));
    }
  }
  return { spouses, parents, children, siblings };
}

// ---- Villages ----
app.get("/api/villages", async (_req, res) => {
  await db.read();
  res.json(db.data.villages);
});

app.post("/api/villages", async (req, res) => {
  const { name, type = "village", color, region } = req.body ?? {};
  if (!name || !color) return res.status(400).json({ error: "name and color are required" });
  const v: Village = { id: randomUUID(), name, type, color, region };
  await db.update((d) => d.villages.push(v));
  res.status(201).json(v);
});

// ---- People ----
app.get("/api/people", async (req, res) => {
  await db.read();
  const q = String(req.query.q ?? "").toLowerCase();
  const villageId = req.query.villageId as string | undefined;
  let results = db.data.people;
  if (q) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameLocal ?? "").toLowerCase().includes(q)
    );
  }
  if (villageId) {
    results = results.filter((p) => p.currentVillageId === villageId);
  }
  res.json(results);
});

app.get("/api/people/:id", async (req, res) => {
  await db.read();
  const p = db.data.people.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "not found" });
  res.json({ ...p, relations: relationsFor(p.id) });
});

app.post("/api/people", async (req, res) => {
  const body = req.body ?? {};
  const { name, gender, attachTo } = body;
  if (!name || !gender) return res.status(400).json({ error: "name and gender are required" });

  await db.read();
  const isFirstPerson = db.data.people.length === 0;
  if (!isFirstPerson && !attachTo?.personId) {
    return res
      .status(400)
      .json({ error: "New people must be attached to an existing person (attachTo.personId)" });
  }
  if (!isFirstPerson) {
    const anchor = db.data.people.find((p) => p.id === attachTo.personId);
    if (!anchor) return res.status(400).json({ error: "attachTo.personId not found" });
  }

  const newPerson: Person = {
    id: randomUUID(),
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
    createdAt: now(),
    updatedAt: now(),
  };

  await db.update((d) => d.people.push(newPerson));

  let relationship: Relationship | null = null;
  if (!isFirstPerson && attachTo?.personId && attachTo?.relationType) {
    relationship = buildRelationship(attachTo.relationType, attachTo.personId, newPerson.id, body);
    await db.update((d) => d.relationships.push(relationship!));
  }

  res.status(201).json({ person: newPerson, relationship });
});

function buildRelationship(
  relationType: "spouse" | "child" | "parent" | "sibling",
  anchorId: string,
  newId: string,
  body: Record<string, unknown>
): Relationship {
  const base = {
    id: randomUUID(),
    createdAt: now(),
  };
  switch (relationType) {
    case "spouse":
      return {
        ...base,
        type: "spouse",
        personAId: anchorId,
        personBId: newId,
        marriageDate: body.marriageDate as string | undefined,
        isConsanguineous: !!body.isConsanguineous,
      };
    case "child":
      return { ...base, type: "parent-child", personAId: anchorId, personBId: newId };
    case "parent":
      return { ...base, type: "parent-child", personAId: newId, personBId: anchorId };
    case "sibling":
      return { ...base, type: "sibling", personAId: anchorId, personBId: newId };
  }
}

// ---- Relationships ----
app.get("/api/relationships", async (_req, res) => {
  await db.read();
  res.json(db.data.relationships);
});

app.post("/api/relationships", async (req, res) => {
  const { type, personAId, personBId, marriageDate, isConsanguineous } = req.body ?? {};
  if (!type || !personAId || !personBId) {
    return res.status(400).json({ error: "type, personAId, personBId are required" });
  }
  await db.read();
  const aExists = db.data.people.some((p) => p.id === personAId);
  const bExists = db.data.people.some((p) => p.id === personBId);
  if (!aExists || !bExists) return res.status(400).json({ error: "unknown person id" });

  const rel: Relationship = {
    id: randomUUID(),
    type,
    personAId,
    personBId,
    marriageDate,
    isConsanguineous: !!isConsanguineous,
    createdAt: now(),
  };
  await db.update((d) => d.relationships.push(rel));
  res.status(201).json(rel);
});

// ---- Duplicate detection ----
app.get("/api/duplicates", async (req, res) => {
  await db.read();
  const name = String(req.query.name ?? "").toLowerCase().trim();
  if (!name) return res.json([]);
  const matches = db.data.people.filter((p) => {
    const n = p.name.toLowerCase();
    return n === name || n.includes(name) || name.includes(n);
  });
  res.json(matches.map(personSummary));
});

// ---- Relationship path finder ----
app.get("/api/path", async (req, res) => {
  await db.read();
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  const fromPerson = db.data.people.find((p) => p.id === from);
  const toPerson = db.data.people.find((p) => p.id === to);
  if (!fromPerson || !toPerson) return res.status(404).json({ error: "person not found" });

  const steps = findPath(from, to, db.data.people, db.data.relationships);
  if (steps === null) return res.json({ connected: false, steps: [], caption: "No known connection yet." });

  const caption = captionFor(steps, toPerson.name);
  res.json({ connected: true, steps, caption });
});

const PORT = Number(process.env.PORT ?? 4001);
app.listen(PORT, () => {
  console.log(`Relationship Tracker API listening on http://localhost:${PORT}`);
});
