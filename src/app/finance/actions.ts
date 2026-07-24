"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();

  if (!category || !(amount > 0)) return;

  await prisma.expense.create({
    data: {
      category,
      amount,
      note,
      ...(dateRaw ? { date: new Date(dateRaw) } : {}),
    },
  });

  revalidatePath("/finance");
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/finance");
}
