"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim() || null;
  const brandId = String(formData.get("brandId") ?? "").trim() || null;
  const reorderPoint = Number(formData.get("reorderPoint") ?? 0);
  const defaultCostPriceRaw = String(formData.get("defaultCostPrice") ?? "").trim();
  const defaultSellPriceRaw = String(formData.get("defaultSellPrice") ?? "").trim();
  const defaultCostPrice = defaultCostPriceRaw ? Number(defaultCostPriceRaw) : null;
  const defaultSellPrice = defaultSellPriceRaw ? Number(defaultSellPriceRaw) : null;

  if (!name || !unit) return;

  await prisma.product.create({
    data: { name, unit, size, brandId, reorderPoint, defaultCostPrice, defaultSellPrice },
  });

  revalidatePath("/products");
  revalidatePath("/stock-counts");
  revalidatePath("/movements");
}

export async function updateProduct(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim() || null;
  const brandId = String(formData.get("brandId") ?? "").trim() || null;
  const reorderPoint = Number(formData.get("reorderPoint") ?? 0);
  const defaultCostPriceRaw = String(formData.get("defaultCostPrice") ?? "").trim();
  const defaultSellPriceRaw = String(formData.get("defaultSellPrice") ?? "").trim();

  if (!name || !unit) return;

  await prisma.product.update({
    where: { id },
    data: {
      name,
      unit,
      size,
      brandId,
      reorderPoint,
      defaultCostPrice: defaultCostPriceRaw ? Number(defaultCostPriceRaw) : null,
      defaultSellPrice: defaultSellPriceRaw ? Number(defaultSellPriceRaw) : null,
    },
  });

  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/stock-counts");
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/products");
  revalidatePath("/stock-counts");
}
