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

// ใบรับเข้าต้องเป็นซัพพลายเออร์ ใบขายออกต้องเป็นลูกค้า ยกเว้นแก้ใบเก่าที่ไม่ได้เปลี่ยนคู่ค้า
async function partnerMatchesType(partnerId: string, type: MovementType, existingPartnerId?: string) {
  if (partnerId === existingPartnerId) return true;
  const partner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { type: true } });
  return partner?.type === (type === "OUT" ? "CUSTOMER" : "SUPPLIER");
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
  if (!(await partnerMatchesType(partnerId, type))) return;

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
  const existing = await prisma.movement.findUnique({ where: { id }, select: { partnerId: true } });
  if (!existing || !(await partnerMatchesType(partnerId, type, existing.partnerId))) return;

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
