-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ออเดอร์เดิมใช้เวลาที่สร้างเป็นวันที่สั่ง
UPDATE "Order" SET "orderDate" = "createdAt";
