import { prisma } from "./db.js";

async function seed() {
  const existing = await prisma.village.count();
  if (existing > 0) {
    console.log("Villages already seeded, skipping.");
    return;
  }

  await prisma.village.createMany({
    data: [
      { name: "Rampur", color: "#2f81f7" },
      { name: "Shivgaon", color: "#e0763a" },
    ],
  });

  console.log("Seeded starter villages.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
