/*
  Warnings:

  - Added the required column `ownerId` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'super_admin');

-- CreateEnum
CREATE TYPE "TreeVisibility" AS ENUM ('open', 'private');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('pending', 'accepted', 'declined');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "treeVisibility" "TreeVisibility" NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'pending',
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "Profile_email_idx" ON "Profile"("email");

-- CreateIndex
CREATE INDEX "ConnectionRequest_toUserId_idx" ON "ConnectionRequest"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_fromUserId_toUserId_key" ON "ConnectionRequest"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "Person_ownerId_idx" ON "Person"("ownerId");

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
