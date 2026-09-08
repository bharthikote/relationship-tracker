-- CreateTable
CREATE TABLE "InviteLink" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "permission" "ConnectionPermission" NOT NULL DEFAULT 'view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_fromUserId_key" ON "InviteLink"("fromUserId");

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
