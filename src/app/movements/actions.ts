"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { MovementType, DeliveryMethod } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { parseLines } from "@/lib/parse-lines";

// วิธีรับของเก็บเฉพาะใบขายออก
function parseDeliveryMethod(formData: FormData, type: MovementType): DeliveryMethod | null {
  const raw = String(formData.get("deliveryMethod") ?? "");
  return type === "OUT" && (raw === "DELIVERY" || raw === "PICKUP") ? raw : null;
}

function revalidateMovementPaths() {
  revalidatePath("/movements");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath("/customers/list");
}

export async function createMovement(formData: FormData) {
  if (!(await isAdmin())) return;
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
  if (!(await isAdmin())) return;
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
  if (!(await isAdmin())) return;
  await prisma.movement.delete({ where: { id } });
  revalidateMovementPaths();
}
