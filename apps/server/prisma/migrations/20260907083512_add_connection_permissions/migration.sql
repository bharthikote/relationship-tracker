-- CreateEnum
CREATE TYPE "ConnectionPermission" AS ENUM ('view', 'edit');

-- AlterTable
ALTER TABLE "ConnectionRequest" ADD COLUMN     "fromPermission" "ConnectionPermission" NOT NULL DEFAULT 'view',
ADD COLUMN     "toPermission" "ConnectionPermission" NOT NULL DEFAULT 'view';
