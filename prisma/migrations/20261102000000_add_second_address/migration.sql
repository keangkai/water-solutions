-- AlterTable
ALTER TABLE "Partner" ADD COLUMN "address2" TEXT,
ADD COLUMN "address2Label" TEXT,
ADD COLUMN "latitude2" DOUBLE PRECISION,
ADD COLUMN "longitude2" DOUBLE PRECISION,
ADD COLUMN "mapUrl2" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "useSecondAddress" BOOLEAN NOT NULL DEFAULT false;
