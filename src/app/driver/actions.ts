"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { currentRole } from "@/lib/auth";
import { roundLabel, todayInBangkok } from "@/lib/delivery";
import { getStockSnapshot, stockKey } from "@/lib/stock";
import { incidentKindForReason } from "@/lib/blacklist";

// stockWarning = สต็อกในระบบไม่พอ คนขับยืนยันส่งต่อได้ (overrideStock) แต่จะมีบันทึกให้ admin เห็น
type Result = { error: string } | { stockWarning: string } | { ok: true };

function revalidateDeliveryPaths() {
  revalidatePath("/driver");
  revalidatePath("/orders");
  revalidatePath("/movements");
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath("/customers/list");
}

// คนขับกดส่งแล้ว: บันทึกจำนวนที่ส่งจริง แล้วสร้างใบขายออกเพื่อตัดสต็อกและนับยอดขาย
// จำนวนที่ลูกค้าสั่งไม่ถูกแก้ ถ้าส่งไม่ครบต้องใส่เหตุผล
export async function deliverOrder(id: string, formData: FormData): Promise<Result> {
  const role = await currentRole();
  if (!role) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  const order = await prisma.order.findUnique({ where: { id }, include: { lines: true } });
  // admin ยืนยันย้อนหลังได้แม้คนขับเคยกด "ส่งไม่ได้" (เช่น ส่งได้ในภายหลัง) คนขับกดได้เฉพาะงานที่ยังรอส่ง
  const allowed = role === "admin" ? ["CONFIRMED", "FAILED"] : ["CONFIRMED"];
  if (!order || !allowed.includes(order.status)) return { error: "ออเดอร์นี้ถูกบันทึกไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด" };

  const delivered = order.lines.map((line) => {
    const raw = formData.get(`delivered.${line.id}`);
    const value = raw === null || raw === "" ? line.quantity : Math.floor(Number(raw));
    return { line, quantity: Number.isFinite(value) ? Math.min(Math.max(value, 0), line.quantity) : line.quantity };
  });

  const isShort = delivered.some((d) => d.quantity < d.line.quantity);
  const reason = String(formData.get("issueReason") ?? "").trim() || null;
  if (isShort && !reason) return { error: "ส่งไม่ครบ ต้องใส่เหตุผล" };
  if (delivered.every((d) => d.quantity === 0)) return { error: "ไม่ได้ส่งเลยสักรายการ ให้กด \"ส่งไม่ได้\" แทน" };

  // เช็กสต็อกของคลังที่โหลดของ ไม่บล็อกถาวรเพราะข้อมูลสต็อกอาจบันทึกช้ากว่าของจริง
  const { onHand } = await getStockSnapshot();
  const shortages = delivered
    .filter((d) => d.quantity > 0)
    .map((d) => ({ d, available: onHand.get(stockKey(d.line.productId, order.warehouseId)) ?? 0 }))
    .filter(({ d, available }) => d.quantity > available);
  const overrideStock = formData.get("overrideStock") === "1";
  if (shortages.length > 0 && !overrideStock) {
    const detail = await prisma.product.findMany({
      where: { id: { in: shortages.map((s) => s.d.line.productId) } },
      select: { id: true, name: true },
    });
    const names = new Map(detail.map((p) => [p.id, p.name]));
    return {
      stockWarning: `สต็อกในระบบไม่พอ: ${shortages
        .map((s) => `${names.get(s.d.line.productId)} เหลือ ${s.available} ส่ง ${s.d.quantity}`)
        .join(", ")}`,
    };
  }

  const movementNote = [
    `ส่งตามออเดอร์ รอบ ${roundLabel(order.deliveryRound)}`,
    isShort && `ส่งไม่ครบ: ${reason}`,
    shortages.length > 0 && "สต็อกในระบบไม่พอตอนส่ง ตรวจยอดรับเข้า",
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    await prisma.$transaction([
      // where มีสถานะด้วย กันกดส่งซ้ำแล้วได้ใบขายออกสองใบ
      prisma.order.update({
        where: { id, status: order.status },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          issueReason: isShort ? reason : null,
          movement: {
            create: {
              type: "OUT",
              partnerId: order.partnerId,
              warehouseId: order.warehouseId,
              deliveryMethod: "DELIVERY",
              date: new Date(todayInBangkok()),
              note: movementNote,
              lines: {
                create: delivered
                  .filter((d) => d.quantity > 0)
                  .map((d) => ({ productId: d.line.productId, quantity: d.quantity, unitPrice: d.line.unitPrice })),
              },
            },
          },
        },
      }),
      ...delivered.map((d) =>
        prisma.orderLine.update({ where: { id: d.line.id }, data: { deliveredQuantity: d.quantity } })
      ),
    ]);
  } catch {
    return { error: "บันทึกไม่สำเร็จ ออเดอร์อาจถูกบันทึกไปแล้ว รีเฟรชหน้าแล้วลองใหม่" };
  }

  revalidateDeliveryPaths();
  return { ok: true };
}

export async function failOrder(id: string, formData: FormData): Promise<Result> {
  if (!(await currentRole())) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  const reason = String(formData.get("issueReason") ?? "").trim();
  if (!reason) return { error: "ต้องใส่เหตุผลที่ส่งไม่ได้" };

  const { count } = await prisma.order.updateMany({
    where: { id, status: "CONFIRMED" },
    data: { status: "FAILED", issueReason: reason },
  });
  if (count === 0) return { error: "ออเดอร์นี้ถูกบันทึกไปแล้ว รีเฟรชหน้าเพื่อดูสถานะล่าสุด" };

  // ลูกค้าไม่อยู่/ไม่รับสาย/ยกเลิก: บันทึกเป็นประวัติของลูกค้าอัตโนมัติ (ใช้ประกอบการขึ้นบัญชีดำ)
  const kind = incidentKindForReason(reason);
  if (kind) {
    const order = await prisma.order.findUnique({ where: { id }, select: { partnerId: true } });
    if (order) await prisma.customerIncident.create({ data: { partnerId: order.partnerId, orderId: id, kind, note: reason } });
    revalidatePath("/customers/list");
    revalidatePath(`/customers/${order?.partnerId}`);
  }

  revalidateDeliveryPaths();
  return { ok: true };
}
