"use server";

import { prisma } from "@/lib/prisma";
import { PartnerType, CustomerSegment } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { segmentLabel } from "@/lib/customer-labels";

function parsePartner(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PartnerType;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name || (type !== "SUPPLIER" && type !== "CUSTOMER")) return null;

  // ข้อมูลสำหรับวิเคราะห์ลูกค้า เก็บเฉพาะคู่ค้าที่เป็นลูกค้า
  const isCustomer = type === "CUSTOMER";
  const segmentRaw = String(formData.get("segment") ?? "");
  const segment = isCustomer && segmentRaw in segmentLabel ? (segmentRaw as CustomerSegment) : null;
  const zone = isCustomer ? String(formData.get("zone") ?? "").trim() || null : null;
  const sourceId = isCustomer ? String(formData.get("sourceId") ?? "") || null : null;

  return { name, type, phone, address, segment, zone, sourceId };
}

function revalidatePartnerPaths() {
  revalidatePath("/partners");
  revalidatePath("/movements");
  revalidatePath("/customers");
}

export async function createPartner(formData: FormData) {
  const data = parsePartner(formData);
  if (!data) return;

  await prisma.partner.create({ data });

  revalidatePartnerPaths();
}

export async function updatePartner(id: string, formData: FormData) {
  const data = parsePartner(formData);
  if (!data) return;

  await prisma.partner.update({ where: { id }, data });

  revalidatePartnerPaths();
}

export async function deletePartner(id: string) {
  await prisma.partner.delete({ where: { id } });
  revalidatePartnerPaths();
}
