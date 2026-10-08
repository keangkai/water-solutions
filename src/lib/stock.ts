import { prisma } from "./prisma";

export const stockKey = (productId: string, warehouseId: string) => `${productId}|${warehouseId}`;

// สต็อกคงเหลือ = รับเข้า − ขายออก ± โอนย้าย ต่อสินค้าต่อคลัง
// ยอดจอง = จำนวนในออเดอร์ที่ยืนยันแล้วแต่คนขับยังไม่ส่ง (ยังไม่ถูกตัดสต็อก)
export async function getStockSnapshot() {
  const [lines, reservedLines, transferLines] = await Promise.all([
    prisma.movementLine.findMany({
      select: { productId: true, quantity: true, movement: { select: { type: true, warehouseId: true } } },
    }),
    prisma.orderLine.findMany({
      where: { order: { status: "CONFIRMED" } },
      select: { productId: true, quantity: true, order: { select: { warehouseId: true } } },
    }),
    prisma.transferLine.findMany({
      select: {
        productId: true,
        quantity: true,
        transfer: { select: { fromWarehouseId: true, toWarehouseId: true } },
      },
    }),
  ]);

  const onHand = new Map<string, number>();
  for (const l of lines) {
    const key = stockKey(l.productId, l.movement.warehouseId);
    onHand.set(key, (onHand.get(key) ?? 0) + (l.movement.type === "IN" ? l.quantity : -l.quantity));
  }

  // โอนย้าย: ตัดคลังต้นทาง เพิ่มคลังปลายทาง ยอดรวมทุกคลังไม่เปลี่ยน
  for (const l of transferLines) {
    const from = stockKey(l.productId, l.transfer.fromWarehouseId);
    const to = stockKey(l.productId, l.transfer.toWarehouseId);
    onHand.set(from, (onHand.get(from) ?? 0) - l.quantity);
    onHand.set(to, (onHand.get(to) ?? 0) + l.quantity);
  }

  const reserved = new Map<string, number>();
  for (const l of reservedLines) {
    const key = stockKey(l.productId, l.order.warehouseId);
    reserved.set(key, (reserved.get(key) ?? 0) + l.quantity);
  }

  return { onHand, reserved };
}

// รวมทุกคลังต่อสินค้า
export function totalsByProduct(map: Map<string, number>) {
  const totals = new Map<string, number>();
  for (const [key, qty] of map) {
    const productId = key.split("|")[0];
    totals.set(productId, (totals.get(productId) ?? 0) + qty);
  }
  return totals;
}
