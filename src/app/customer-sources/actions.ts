"use server";

import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateSourcePaths() {
  revalidatePath("/customer-sources");
  revalidatePath("/partners");
  revalidatePath("/customers");
}

export async function createCustomerSource(formData: FormData) {
  if (!(await isAdmin())) return;
  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "");
  if (!name || (channel !== "OFFLINE" && channel !== "ONLINE")) return;

  // ชื่อช่องทางห้ามซ้ำ ถ้ามีอยู่แล้วไม่ต้องสร้างใหม่
  const existing = await prisma.customerSource.findUnique({ where: { name } });
  if (existing) return;

  await prisma.customerSource.create({ data: { name, channel } });

  revalidateSourcePaths();
}

export async function setCustomerSourceActive(id: string, isActive: boolean) {
  if (!(await isAdmin())) return;
  await prisma.customerSource.update({ where: { id }, data: { isActive } });
  revalidateSourcePaths();
}

export async function deleteCustomerSource(id: string) {
  if (!(await isAdmin())) return;
  // ลบได้เฉพาะช่องทางที่ยังไม่มีลูกค้าใช้ ถ้ามีแล้วให้ปิดใช้งานแทน
  const used = await prisma.partner.count({ where: { sourceId: id } });
  if (used > 0) return;

  await prisma.customerSource.delete({ where: { id } });
  revalidateSourcePaths();
}
