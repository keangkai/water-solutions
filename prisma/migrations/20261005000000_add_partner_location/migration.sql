-- AlterEnum
ALTER TYPE "CustomerSegment" ADD VALUE 'GROCERY';

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "mapUrl" TEXT;
