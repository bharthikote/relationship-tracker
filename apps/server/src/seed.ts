import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import type { Person, Relationship, Village } from "./types.js";

const now = () => new Date().toISOString();

function village(name: string, color: string): Village {
  return { id: randomUUID(), name, type: "village", color };
}

function person(
  name: string,
  gender: Person["gender"],
  nativeVillageId: string,
  currentVillageId: string,
  opts: Partial<Person> = {}
): Person {
  return {
    id: randomUUID(),
    name,
    gender,
    isDeceased: false,
    nativeVillageId,
    currentVillageId,
    locationHistory: [],
    verified: true,
    createdAt: now(),
    updatedAt: now(),
    ...opts,
  };
}

async function seed() {
  await db.read();
  if (db.data.people.length > 0) {
    console.log("DB already has data, skipping seed.");
    return;
  }

  const rampur = village("Rampur", "#2f81f7");
  const shivgaon = village("Shivgaon", "#e0763a");
  db.data.villages.push(rampur, shivgaon);

  const ramesh = person("Ramesh Patil", "male", rampur.id, rampur.id);
  const sita = person("Sita Patil", "female", shivgaon.id, rampur.id, {
    locationHistory: [
      { villageId: shivgaon.id, event: "birth" },
      { villageId: rampur.id, event: "marriage", fromDate: "2001-02-10" },
    ],
  });
  const anil = person("Anil Patil", "male", rampur.id, rampur.id);
  const deepa = person("Deepa Patil", "female", rampur.id, rampur.id);
  const kiran = person("Kiran Jadhav", "male", shivgaon.id, shivgaon.id);
  const meena = person("Meena Jadhav", "female", rampur.id, shivgaon.id, {
    locationHistory: [
      { villageId: rampur.id, event: "birth" },
      { villageId: shivgaon.id, event: "marriage", fromDate: "2020-11-20" },
    ],
  });

  db.data.people.push(ramesh, sita, anil, deepa, kiran, meena);

  const rel = (
    type: Relationship["type"],
    a: Person,
    b: Person,
    extra: Partial<Relationship> = {}
  ): Relationship => ({
    id: randomUUID(),
    type,
    personAId: a.id,
    personBId: b.id,
    createdAt: now(),
    ...extra,
  });

  db.data.relationships.push(
    rel("spouse", ramesh, sita, { marriageDate: "2001-02-10" }),
    rel("parent-child", ramesh, anil),
    rel("parent-child", sita, anil),
    rel("parent-child", ramesh, meena),
    rel("parent-child", sita, meena),
    rel("sibling", anil, meena),
    rel("spouse", kiran, meena, {
      marriageDate: "2020-11-20",
      isConsanguineous: false,
    }),
    rel("parent-child", anil, deepa)
  );
  // anil's spouse omitted for brevity; deepa attached as anil's child directly for demo purposes

  await db.write();
  console.log("Seeded sample village tree.");
}

seed();
