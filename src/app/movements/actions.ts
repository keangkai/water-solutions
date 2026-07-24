"use server";

import { prisma } from "@/lib/prisma";
import { MovementType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

function parseLines(formData: FormData) {
  const lineMap = new Map<number, { productId?: string; quantity?: number; unitPrice?: number }>();
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^lines\.(\d+)\.(productId|quantity|unitPrice)$/);
    if (!match) continue;
    const idx = Number(match[1]);
    const current = lineMap.get(idx) ?? {};
    if (match[2] === "productId") current.productId = String(value);
    else if (match[2] === "quantity") current.quantity = Number(value);
    else current.unitPrice = Number(value);
    lineMap.set(idx, current);
  }

  return Array.from(lineMap.values()).filter(
    (l): l is { productId: string; quantity: number; unitPrice: number } =>
      !!l.productId && typeof l.quantity === "number" && l.quantity > 0 && typeof l.unitPrice === "number" && l.unitPrice >= 0
  );
}

export async function createMovement(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const type = String(formData.get("type") ?? "") as MovementType;
  const note = String(formData.get("note") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();

  if (!partnerId || !warehouseId || (type !== "IN" && type !== "OUT")) return;

  const lines = parseLines(formData);
  if (lines.length === 0) return;

  await prisma.movement.create({
    data: {
      type,
      partnerId,
      warehouseId,
      note,
      ...(dateRaw ? { date: new Date(dateRaw) } : {}),
      lines: { create: lines },
    },
  });

  revalidatePath("/movements");
  revalidatePath("/reports");
}

export async function updateMovement(id: string, formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const type = String(formData.get("type") ?? "") as MovementType;
  const note = String(formData.get("note") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();

  if (!partnerId || !warehouseId || (type !== "IN" && type !== "OUT")) return;

  const lines = parseLines(formData);
  if (lines.length === 0) return;

  await prisma.$transaction([
    prisma.movement.update({
      where: { id },
      data: {
        type,
        partnerId,
        warehouseId,
        note,
        ...(dateRaw ? { date: new Date(dateRaw) } : {}),
      },
    }),
    prisma.movementLine.deleteMany({ where: { movementId: id } }),
    prisma.movementLine.createMany({
      data: lines.map((l) => ({ ...l, movementId: id })),
    }),
  ]);

  revalidatePath("/movements");
  revalidatePath("/reports");
}

export async function deleteMovement(id: string) {
  await prisma.movement.delete({ where: { id } });
  revalidatePath("/movements");
  revalidatePath("/reports");
}
