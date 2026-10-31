"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { currentRole } from "@/lib/auth";
import { earliestDeliveryDate, isDeliveryRound } from "@/lib/delivery";
import { parseLines } from "@/lib/parse-lines";
import { warehouseUsable } from "@/lib/warehouses";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function revalidateOrderPaths() {
  revalidatePath("/orders");
  revalidatePath("/driver");
}

function parseOrder(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const deliveryDate = String(formData.get("deliveryDate") ?? "").trim();
  const orderDateRaw = String(formData.get("orderDate") ?? "").trim();
  const deliveryRound = String(formData.get("deliveryRound") ?? "");
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const lines = parseLines(formData);

  if (!partnerId || !warehouseId || !datePattern.test(deliveryDate) || !isDeliveryRound(deliveryRound)) return null;
  if (lines.length === 0) return null;

  return {
    data: {
      partnerId,
      warehouseId,
      ...(datePattern.test(orderDateRaw) ? { orderDate: new Date(orderDateRaw) } : {}),
      deliveryDate: new Date(deliveryDate),
      deliveryRound,
      deliveryAddress,
      note,
    },
    lines,
  };
}

export async function createOrder(formData: FormData) {
  if ((await currentRole()) !== "admin") return;
  const parsed = parseOrder(formData);
  if (!parsed) return;
  if (!(await warehouseUsable(parsed.data.warehouseId))) return;
  // ลูกค้าบัญชีดำ: ต้องยืนยันจึงจะสร้างออเดอร์ได้ (กันกดพลาด ไม่ใช่การห้ามเด็ดขาด)
  const partner = await prisma.partner.findUnique({ where: { id: parsed.data.partnerId }, select: { isBlacklisted: true } });
  if (partner?.isBlacklisted && formData.get("confirmBlacklisted") !== "1") return;
  // วันส่งย้อนหลังได้ไม่เกิน BACKDATE_DAYS วัน (แก้ไข/เลื่อนวันของออเดอร์เดิมไม่ติดเงื่อนไขนี้)
  if (parsed.data.deliveryDate.toISOString().slice(0, 10) < earliestDeliveryDate()) return;

  await prisma.order.create({
    data: { ...parsed.data, lines: { create: parsed.lines } },
  });

  revalidateOrderPaths();
}

// แก้ไขหรือเลื่อนวันส่ง ใช้ได้กับออเดอร์ที่ยังไม่ได้ส่ง และส่งกลับไปเป็นรอส่งอีกครั้ง
export async function updateOrder(id: string, formData: FormData) {
  if ((await currentRole()) !== "admin") return;
  const parsed = parseOrder(formData);
  if (!parsed) return;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || (order.status !== "CONFIRMED" && order.status !== "FAILED")) return;
  if (!(await warehouseUsable(parsed.data.warehouseId, order.warehouseId))) return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { ...parsed.data, status: "CONFIRMED", issueReason: null },
    }),
    prisma.orderLine.deleteMany({ where: { orderId: id } }),
    prisma.orderLine.createMany({ data: parsed.lines.map((l) => ({ ...l, orderId: id })) }),
  ]);

  revalidateOrderPaths();
}

export async function cancelOrder(id: string, formData?: FormData) {
  if ((await currentRole()) !== "admin") return;

  const { count } = await prisma.order.updateMany({
    where: { id, status: { in: ["CONFIRMED", "FAILED"] } },
    data: { status: "CANCELLED" },
  });

  // ติ๊ก "ลูกค้าเป็นฝ่ายยกเลิก" แล้วบันทึกเป็นประวัติของลูกค้า (ใช้ประกอบการขึ้นบัญชีดำ)
  if (count > 0 && formData?.get("byCustomer") === "1") {
    const order = await prisma.order.findUnique({ where: { id }, select: { partnerId: true } });
    if (order) {
      await prisma.customerIncident.create({ data: { partnerId: order.partnerId, orderId: id, kind: "CANCELLED", note: "ลูกค้ายกเลิกออเดอร์" } });
      revalidatePath("/customers/list");
      revalidatePath(`/customers/${order.partnerId}`);
    }
  }

  revalidateOrderPaths();
}

// admin ยืนยันว่าลูกค้าโอนเงินเข้าบัญชีแล้ว หลังส่งของเสร็จ
export async function setOrderPaid(id: string, paid: boolean) {
  if ((await currentRole()) !== "admin") return;

  await prisma.order.updateMany({
    where: { id, status: "DELIVERED" },
    data: { paidAt: paid ? new Date() : null },
  });

  revalidateOrderPaths();
}
