"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function revalidateTransferPaths() {
  revalidatePath("/transfers");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function createTransfer(formData: FormData) {
  if (!(await isAdmin())) return;

  const fromWarehouseId = String(formData.get("fromWarehouseId") ?? "");
  const toWarehouseId = String(formData.get("toWarehouseId") ?? "");
  const dateRaw = String(formData.get("date") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) return;

  // รวมแถวสินค้าซ้ำเข้าด้วยกัน
  const quantities = new Map<string, number>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^lines\.(\d+)\.productId$/);
    if (!match) continue;
    const quantity = Math.floor(Number(formData.get(`lines.${match[1]}.quantity`)));
    const productId = String(value);
    if (productId && quantity > 0) quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  if (quantities.size === 0) return;

  await prisma.transfer.create({
    data: {
      fromWarehouseId,
      toWarehouseId,
      note,
      ...(datePattern.test(dateRaw) ? { date: new Date(dateRaw) } : {}),
      lines: { create: Array.from(quantities, ([productId, quantity]) => ({ productId, quantity })) },
    },
  });

  revalidateTransferPaths();
}

export async function deleteTransfer(id: string) {
  if (!(await isAdmin())) return;
  await prisma.transfer.delete({ where: { id } });
  revalidateTransferPaths();
}
