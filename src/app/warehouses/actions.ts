"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getStockSnapshot } from "@/lib/stock";

export async function createWarehouse(formData: FormData) {
  if (!(await isAdmin())) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.warehouse.create({ data: { name } });

  revalidatePath("/warehouses");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}

async function warehouseHasGoods(warehouseId: string) {
  const { onHand } = await getStockSnapshot();
  for (const [key, qty] of onHand) {
    if (key.endsWith(`|${warehouseId}`) && qty > 0) return true;
  }
  return false;
}

export async function setWarehouseActive(id: string, isActive: boolean) {
  if (!(await isAdmin())) return;
  // ปิดคลังที่ยังมีของคงเหลือไม่ได้ ของจะค้างอยู่ในคลังที่ไม่มีใครเลือกใช้ (ยอดติดลบไม่กัน แค่เตือนในหน้าคลัง)
  if (!isActive && (await warehouseHasGoods(id))) return;
  await prisma.warehouse.update({ where: { id }, data: { isActive } });
  for (const path of ["/warehouses", "/movements", "/orders", "/transfers", "/stock-counts", "/reports"]) revalidatePath(path);
}

export async function deleteWarehouse(id: string) {
  if (!(await isAdmin())) return;
  try {
    await prisma.warehouse.delete({ where: { id } });
  } catch {
    // คลังที่มีประวัติผูกอยู่ลบไม่ได้ ต้องปิดใช้งานแทน
    return;
  }
  revalidatePath("/warehouses");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}
