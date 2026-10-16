"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { PartnerType, CustomerSegment } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { segmentLabel } from "@/lib/customer-labels";
import { coordsFromMapLink } from "@/lib/maps-link";

async function parsePartner(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PartnerType;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name || (type !== "SUPPLIER" && type !== "CUSTOMER")) return null;

  // ข้อมูลสำหรับวิเคราะห์ลูกค้า เก็บเฉพาะคู่ค้าที่เป็นลูกค้า
  const isCustomer = type === "CUSTOMER";
  const segmentRaw = String(formData.get("segment") ?? "");
  const segment = isCustomer && segmentRaw in segmentLabel ? (segmentRaw as CustomerSegment) : null;
  const zone = isCustomer ? String(formData.get("zone") ?? "").trim() || null : null;
  const sourceId = isCustomer ? String(formData.get("sourceId") ?? "") || null : null;
  const facebookName = isCustomer ? String(formData.get("facebookName") ?? "").trim() || null : null;
  const mapUrl = isCustomer ? String(formData.get("mapUrl") ?? "").trim() || null : null;
  const coords = mapUrl ? await coordsFromMapLink(mapUrl) : null;

  return {
    name,
    type,
    companyName,
    facebookName,
    phone,
    address,
    segment,
    zone,
    sourceId,
    mapUrl,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  };
}

function revalidatePartnerPaths() {
  revalidatePath("/partners");
  revalidatePath("/movements");
  revalidatePath("/customers");
  revalidatePath("/customers/list");
  revalidatePath("/orders");
  revalidatePath("/driver");
}

export async function createPartner(formData: FormData) {
  if (!(await isAdmin())) return;
  const data = await parsePartner(formData);
  if (!data) return;

  await prisma.partner.create({ data });

  revalidatePartnerPaths();
}

export async function updatePartner(id: string, formData: FormData) {
  if (!(await isAdmin())) return;
  const data = await parsePartner(formData);
  if (!data) return;

  await prisma.partner.update({ where: { id }, data });

  revalidatePartnerPaths();
}

export async function deletePartner(id: string) {
  if (!(await isAdmin())) return;
  await prisma.partner.delete({ where: { id } });
  revalidatePartnerPaths();
}
