-- CreateEnum
CREATE TYPE "IncidentKind" AS ENUM ('CANCELLED', 'NO_ANSWER');

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "blacklistReason" TEXT,
ADD COLUMN     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN     "isBlacklisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CustomerIncident" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "orderId" TEXT,
    "kind" "IncidentKind" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerIncident_partnerId_createdAt_idx" ON "CustomerIncident"("partnerId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerIncident" ADD CONSTRAINT "CustomerIncident_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIncident" ADD CONSTRAINT "CustomerIncident_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
