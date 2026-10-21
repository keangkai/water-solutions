"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import type { IncidentKind } from "@/generated/prisma/client";

function revalidateCustomerPaths(id: string) {
  for (const p of ["/customers/list", "/customers", `/customers/${id}`, "/partners", "/orders", "/driver", "/movements"]) revalidatePath(p);
}

// ขึ้นบัญชีดำ ต้องใส่เหตุผล
export async function setBlacklist(partnerId: string, formData: FormData) {
  if (!(await isAdmin())) return;
  const preset = String(formData.get("preset") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const reason = [preset, note].filter(Boolean).join(" · ");
  if (!reason) return;

  await prisma.partner.updateMany({
    where: { id: partnerId, type: "CUSTOMER" },
    data: { isBlacklisted: true, blacklistReason: reason, blacklistedAt: new Date() },
  });
  revalidateCustomerPaths(partnerId);
}

export async function clearBlacklist(partnerId: string) {
  if (!(await isAdmin())) return;
  await prisma.partner.updateMany({
    where: { id: partnerId },
    data: { isBlacklisted: false, blacklistReason: null, blacklistedAt: null },
  });
  revalidateCustomerPaths(partnerId);
}

// บันทึกเหตุการณ์เอง (เช่น โทรแล้วไม่รับ ลูกค้าทักมายกเลิก)
export async function logIncident(partnerId: string, kind: IncidentKind, formData: FormData) {
  if (!(await isAdmin())) return;
  if (kind !== "CANCELLED" && kind !== "NO_ANSWER") return;
  const note = String(formData.get("note") ?? "").trim() || null;
  await prisma.customerIncident.create({ data: { partnerId, kind, note } });
  revalidateCustomerPaths(partnerId);
}

// ลบเหตุการณ์ที่บันทึกผิด
export async function deleteIncident(partnerId: string, incidentId: string) {
  if (!(await isAdmin())) return;
  await prisma.customerIncident.deleteMany({ where: { id: incidentId, partnerId } });
  revalidateCustomerPaths(partnerId);
}
