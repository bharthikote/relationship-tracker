import { prisma } from "./db.js";
import type { Gender } from "@prisma/client";

async function seed() {
  const existing = await prisma.person.count();
  if (existing > 0) {
    console.log("DB already has data, skipping seed.");
    return;
  }

  const rampur = await prisma.village.create({ data: { name: "Rampur", color: "#2f81f7" } });
  const shivgaon = await prisma.village.create({ data: { name: "Shivgaon", color: "#e0763a" } });

  const person = (name: string, gender: Gender, nativeVillageId: string, currentVillageId: string) =>
    prisma.person.create({
      data: { name, gender, nativeVillageId, currentVillageId, verified: true },
    });

  const ramesh = await person("Ramesh Patil", "male", rampur.id, rampur.id);
  const sita = await prisma.person.create({
    data: {
      name: "Sita Patil",
      gender: "female",
      nativeVillageId: shivgaon.id,
      currentVillageId: rampur.id,
      verified: true,
      locationHistory: [
        { villageId: shivgaon.id, event: "birth" },
        { villageId: rampur.id, event: "marriage", fromDate: "2001-02-10" },
      ],
    },
  });
  const anil = await person("Anil Patil", "male", rampur.id, rampur.id);
  const deepa = await person("Deepa Patil", "female", rampur.id, rampur.id);
  const kiran = await person("Kiran Jadhav", "male", shivgaon.id, shivgaon.id);
  const meena = await prisma.person.create({
    data: {
      name: "Meena Jadhav",
      gender: "female",
      nativeVillageId: rampur.id,
      currentVillageId: shivgaon.id,
      verified: true,
      locationHistory: [
        { villageId: rampur.id, event: "birth" },
        { villageId: shivgaon.id, event: "marriage", fromDate: "2020-11-20" },
      ],
    },
  });

  await prisma.relationship.createMany({
    data: [
      { type: "spouse", personAId: ramesh.id, personBId: sita.id, marriageDate: "2001-02-10" },
      { type: "parent_child", personAId: ramesh.id, personBId: anil.id },
      { type: "parent_child", personAId: sita.id, personBId: anil.id },
      { type: "parent_child", personAId: ramesh.id, personBId: meena.id },
      { type: "parent_child", personAId: sita.id, personBId: meena.id },
      { type: "sibling", personAId: anil.id, personBId: meena.id },
      {
        type: "spouse",
        personAId: kiran.id,
        personBId: meena.id,
        marriageDate: "2020-11-20",
        isConsanguineous: false,
      },
      { type: "parent_child", personAId: anil.id, personBId: deepa.id },
    ],
  });

  console.log("Seeded sample village tree.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
