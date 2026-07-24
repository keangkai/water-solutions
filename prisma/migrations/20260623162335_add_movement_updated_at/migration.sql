/*
  Warnings:

  - Added the required column `updatedAt` to the `StockMovement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "StockMovement" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "updatedAt" SET NOT NULL;
