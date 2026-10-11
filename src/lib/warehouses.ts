import { prisma } from "./prisma";

export type WarehouseOption = { id: string; name: string };

// ตัวเลือกคลังในฟอร์ม: เฉพาะคลังที่ยังเปิดใช้งาน
// keepId = คลังเดิมของรายการที่กำลังแก้ ถ้าปิดไปแล้วยังเลือกต่อได้ (มีป้ายกำกับ) ไม่ให้ข้อมูลเดิมเพี้ยนตอนบันทึก
export function warehouseOptionsFor(
  all: { id: string; name: string; isActive: boolean }[],
  keepId?: string
): WarehouseOption[] {
  return all
    .filter((w) => w.isActive || w.id === keepId)
    .map((w) => ({ id: w.id, name: w.isActive ? w.name : `${w.name} (ปิดใช้งาน)` }));
}

// ฝั่ง server ตรวจก่อนบันทึก: คลังต้องเปิดใช้งาน ยกเว้นแก้รายการเดิมที่ไม่ได้เปลี่ยนคลัง
export async function warehouseUsable(warehouseId: string, existingWarehouseId?: string) {
  if (warehouseId === existingWarehouseId) return true;
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId }, select: { isActive: true } });
  return !!warehouse?.isActive;
}
