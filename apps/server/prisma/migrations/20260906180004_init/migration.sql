-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "VillageType" AS ENUM ('village', 'town', 'city');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('spouse', 'parent_child', 'sibling');

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VillageType" NOT NULL DEFAULT 'village',
    "color" TEXT NOT NULL,
    "region" TEXT,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameLocal" TEXT,
    "gender" "Gender" NOT NULL,
    "dob" TEXT,
    "isDeceased" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "nativeVillageId" TEXT,
    "currentVillageId" TEXT,
    "locationHistory" JSONB NOT NULL DEFAULT '[]',
    "addedBy" TEXT,
    "lastEditedBy" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "personAId" TEXT NOT NULL,
    "personBId" TEXT NOT NULL,
    "marriageDate" TEXT,
    "isConsanguineous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Village_name_idx" ON "Village"("name");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Person_currentVillageId_idx" ON "Person"("currentVillageId");

-- CreateIndex
CREATE INDEX "Relationship_personAId_idx" ON "Relationship"("personAId");

-- CreateIndex
CREATE INDEX "Relationship_personBId_idx" ON "Relationship"("personBId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_nativeVillageId_fkey" FOREIGN KEY ("nativeVillageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_currentVillageId_fkey" FOREIGN KEY ("currentVillageId") REFERENCES "Village"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personAId_fkey" FOREIGN KEY ("personAId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personBId_fkey" FOREIGN KEY ("personBId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
