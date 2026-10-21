"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getStockSnapshot } from "@/lib/stock";
import { coordsFromMapLink } from "@/lib/maps-link";

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

// ตั้งพิกัดคลังจากลิงก์ Google Maps หรือ "lat, lng" ช่องว่าง = ล้างพิกัด
export async function setWarehouseLocation(id: string, formData: FormData) {
  if (!(await isAdmin())) return;
  const text = String(formData.get("location") ?? "").trim();
  const coords = text ? await coordsFromMapLink(text) : null;
  if (text && !coords) return;
  await prisma.warehouse.update({
    where: { id },
    data: { latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null },
  });
  revalidatePath("/warehouses");
  revalidatePath("/driver");
}
