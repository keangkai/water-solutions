"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createStockCount(formData: FormData) {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!warehouseId || !productId || !dateStr) return;

  const lineMap = new Map<number, { label?: string; quantity?: number }>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^lines\.(\d+)\.(label|quantity)$/);
    if (!match) continue;
    const idx = Number(match[1]);
    const current = lineMap.get(idx) ?? {};
    if (match[2] === "label") current.label = String(value).trim();
    else current.quantity = Number(value);
    lineMap.set(idx, current);
  }

  const lines = Array.from(lineMap.values()).filter(
    (l): l is { label: string; quantity: number } =>
      !!l.label && typeof l.quantity === "number" && l.quantity > 0
  );

  if (lines.length === 0) return;

  await prisma.stockCount.create({
    data: {
      date: new Date(dateStr),
      warehouseId,
      productId,
      note,
      lines: { create: lines.map((l) => ({ label: l.label, quantity: l.quantity })) },
    },
  });

  revalidatePath("/stock-counts");
}

export async function deleteStockCount(id: string) {
  await prisma.stockCount.delete({ where: { id } });
  revalidatePath("/stock-counts");
}
