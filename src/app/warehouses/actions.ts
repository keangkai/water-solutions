"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createWarehouse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.warehouse.create({ data: { name } });

  revalidatePath("/warehouses");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}

export async function deleteWarehouse(id: string) {
  await prisma.warehouse.delete({ where: { id } });
  revalidatePath("/warehouses");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}
