"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.brand.create({ data: { name } });

  revalidatePath("/brands");
  revalidatePath("/products");
  revalidatePath("/stock-counts");
}

export async function deleteBrand(id: string) {
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/brands");
  revalidatePath("/products");
  revalidatePath("/stock-counts");
}
