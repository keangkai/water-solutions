-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('HOUSEHOLD', 'SHOP', 'RESTAURANT', 'OFFICE', 'FACTORY', 'OTHER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('OFFLINE', 'ONLINE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "segment" "CustomerSegment",
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "deliveryMethod" "DeliveryMethod";

-- CreateTable
CREATE TABLE "CustomerSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "ChannelType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSource_name_key" ON "CustomerSource"("name");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CustomerSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ช่องทางเริ่มต้นที่ร้านใช้อยู่
INSERT INTO "CustomerSource" ("id", "name", "channel") VALUES
    ('source_referral', 'บอกต่อ', 'OFFLINE'),
    ('source_flyer', 'ใบปลิว', 'OFFLINE');
