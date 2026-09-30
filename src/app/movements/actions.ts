"use server";

import { prisma } from "@/lib/prisma";
import { MovementType, DeliveryMethod } from "@/generated/prisma/client";
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

// วิธีรับของเก็บเฉพาะใบขายออก
function parseDeliveryMethod(formData: FormData, type: MovementType): DeliveryMethod | null {
  const raw = String(formData.get("deliveryMethod") ?? "");
  return type === "OUT" && (raw === "DELIVERY" || raw === "PICKUP") ? raw : null;
}

function revalidateMovementPaths() {
  revalidatePath("/movements");
  revalidatePath("/reports");
  revalidatePath("/customers");
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
      deliveryMethod: parseDeliveryMethod(formData, type),
      ...(dateRaw ? { date: new Date(dateRaw) } : {}),
      lines: { create: lines },
    },
  });

  revalidateMovementPaths();
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
        deliveryMethod: parseDeliveryMethod(formData, type),
        ...(dateRaw ? { date: new Date(dateRaw) } : {}),
      },
    }),
    prisma.movementLine.deleteMany({ where: { movementId: id } }),
    prisma.movementLine.createMany({
      data: lines.map((l) => ({ ...l, movementId: id })),
    }),
  ]);

  revalidateMovementPaths();
}

export async function deleteMovement(id: string) {
  await prisma.movement.delete({ where: { id } });
  revalidateMovementPaths();
}
