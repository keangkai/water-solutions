"use server";

import { prisma } from "@/lib/prisma";
import { PartnerType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function createPartner(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PartnerType;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name || (type !== "SUPPLIER" && type !== "CUSTOMER")) return;

  await prisma.partner.create({
    data: { name, type, phone, address },
  });

  revalidatePath("/partners");
}

export async function updatePartner(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "") as PartnerType;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name || (type !== "SUPPLIER" && type !== "CUSTOMER")) return;

  await prisma.partner.update({
    where: { id },
    data: { name, type, phone, address },
  });

  revalidatePath("/partners");
}

export async function deletePartner(id: string) {
  await prisma.partner.delete({ where: { id } });
  revalidatePath("/partners");
}
