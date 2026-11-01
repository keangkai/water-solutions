"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { PartnerType, CustomerSegment } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  // ที่อยู่ที่ 2 สำหรับลูกค้าที่ส่งสองที่
  const address2 = isCustomer ? String(formData.get("address2") ?? "").trim() || null : null;
  const address2Label = isCustomer ? String(formData.get("address2Label") ?? "").trim() || null : null;
  const mapUrl2 = isCustomer ? String(formData.get("mapUrl2") ?? "").trim() || null : null;
  const coords2 = mapUrl2 ? await coordsFromMapLink(mapUrl2) : null;

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
    address2,
    address2Label,
    mapUrl2,
    latitude2: coords2?.latitude ?? null,
    longitude2: coords2?.longitude ?? null,
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

export type CreateCustomerState = { error: string } | { duplicate: { name: string; phone: string | null } } | null;

// กลับไปหน้าเดิมที่กดมา ยอมเฉพาะ path ภายในเว็บ กัน open redirect
function safeReturnPath(raw: string) {
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") && raw.length <= 200 ? raw : "/customers/list";
}

// เพิ่มลูกค้าจากหน้า /customers/new (ฟอร์มสำหรับมือถือ) ประเภทเป็นลูกค้าเสมอ
// เบอร์โทรซ้ำกับลูกค้าเดิม จะเตือนก่อน ยืนยัน (allowDuplicate) ถึงจะบันทึกซ้ำ
export async function createCustomer(_: CreateCustomerState, formData: FormData): Promise<CreateCustomerState> {
  if (!(await isAdmin())) return { error: "กรุณาเข้าสู่ระบบใหม่" };
  formData.set("type", "CUSTOMER");
  const data = await parsePartner(formData);
  if (!data) return { error: "กรอกชื่อลูกค้า" };

  if (formData.get("allowDuplicate") !== "1" && data.phone) {
    const digits = data.phone.replace(/\D/g, "");
    if (digits.length >= 9) {
      const customers = await prisma.partner.findMany({ where: { type: "CUSTOMER", phone: { not: null } }, select: { name: true, phone: true } });
      const same = customers.find((c) => c.phone && c.phone.replace(/\D/g, "") === digits);
      if (same) return { duplicate: { name: same.name, phone: same.phone } };
    }
  }

  const created = await prisma.partner.create({ data });
  revalidatePartnerPaths();

  const back = safeReturnPath(String(formData.get("return") ?? ""));
  const joiner = back.includes("?") ? "&" : "?";
  redirect(`${back}${joiner}customer=${created.id}&added=1`);
}
