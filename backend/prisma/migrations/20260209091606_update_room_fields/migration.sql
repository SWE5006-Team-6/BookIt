/*
  Warnings:

  - You are about to drop the column `createdById` on the `Room` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_createdById_fkey";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "createdById",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "updatedBy" TEXT NOT NULL;
