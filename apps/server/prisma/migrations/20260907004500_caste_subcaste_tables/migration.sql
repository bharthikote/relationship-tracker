-- CreateTable
CREATE TABLE "Caste" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Caste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcaste" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subcaste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Caste_name_idx" ON "Caste"("name");

-- CreateIndex
CREATE INDEX "Subcaste_name_idx" ON "Subcaste"("name");

-- AlterTable: add new FK columns (old caste/subcaste text columns still present for now)
ALTER TABLE "Person" ADD COLUMN "casteId" TEXT;
ALTER TABLE "Person" ADD COLUMN "subcasteId" TEXT;

-- Backfill: turn existing free-text caste/subcaste values into shared reference rows
INSERT INTO "Caste" ("id", "name")
SELECT gen_random_uuid()::text, d."caste"
FROM (SELECT DISTINCT "caste" FROM "Person" WHERE "caste" IS NOT NULL) AS d("caste");

UPDATE "Person" p
SET "casteId" = c."id"
FROM "Caste" c
WHERE p."caste" = c."name";

INSERT INTO "Subcaste" ("id", "name")
SELECT gen_random_uuid()::text, d."subcaste"
FROM (SELECT DISTINCT "subcaste" FROM "Person" WHERE "subcaste" IS NOT NULL) AS d("subcaste");

UPDATE "Person" p
SET "subcasteId" = s."id"
FROM "Subcaste" s
WHERE p."subcaste" = s."name";

-- AlterTable: drop the old free-text columns now that data is migrated
ALTER TABLE "Person" DROP COLUMN "caste";
ALTER TABLE "Person" DROP COLUMN "subcaste";

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "Caste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_subcasteId_fkey" FOREIGN KEY ("subcasteId") REFERENCES "Subcaste"("id") ON DELETE SET NULL ON UPDATE CASCADE;
