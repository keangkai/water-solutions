"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createWarehouse(formData: FormData) {
  if (!(await isAdmin())) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.warehouse.create({ data: { name } });

  revalidatePath("/warehouses");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}

export async function setWarehouseActive(id: string, isActive: boolean) {
  if (!(await isAdmin())) return;
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
