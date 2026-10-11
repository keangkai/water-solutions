"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { isDeliveryRound } from "@/lib/delivery";
import { coordsFromMapLink } from "@/lib/maps-link";
import { digitsOnly, parseOrderSheet } from "@/lib/parse-sheet";
import { warehouseUsable } from "@/lib/warehouses";

export type PreviewRow = {
  rowNo: number;
  name: string;
  sizes: Record<string, number>;
  orderDate: string | null;
  deliveryDate: string | null;
  customer: "existing" | "new";
  skip: string | null; // เหตุผลที่แถวนี้จะไม่ถูกนำเข้า
};

export type ImportResult =
  | { error: string }
  | { mode: "preview" | "import"; rows: PreviewRow[]; sizeHeaders: string[]; imported: number; defaultsSet: boolean };

export async function importOrders(_: unknown, formData: FormData): Promise<ImportResult> {
  if (!(await isAdmin())) return { error: "ต้องเป็น admin" };

  const mode = formData.get("mode") === "import" ? "import" : "preview";
  const sheet = parseOrderSheet(String(formData.get("text") ?? ""));
  if (sheet.error) return { error: sheet.error };

  const warehouseId = String(formData.get("warehouseId") ?? "");
  const round = String(formData.get("deliveryRound") ?? "");
  const delivered = formData.get("status") === "DELIVERED";
  const paid = delivered && formData.get("paid") === "1";
  const price = Number(formData.get("unitPrice"));
  const cost = Number(formData.get("costPrice"));
  const setDefaults = formData.get("setDefaults") === "1";

  const productBySize = new Map<string, string>();
  for (const h of sheet.sizeHeaders) {
    const id = String(formData.get(`product.${h}`) ?? "");
    if (id) productBySize.set(h, id);
  }
  if (!warehouseId || !(await warehouseUsable(warehouseId))) return { error: "เลือกคลังที่ขึ้นของ (ต้องเป็นคลังที่เปิดใช้งาน)" };
  if (!isDeliveryRound(round)) return { error: "เลือกรอบจัดส่ง" };
  if (!(price >= 0)) return { error: "ใส่ราคาขายต่อแพ็ค" };
  const usedHeaders = new Set(sheet.rows.flatMap((r) => Object.keys(r.sizes)));
  for (const h of usedHeaders) if (!productBySize.has(h)) return { error: `เลือกสินค้าให้ขนาด ${h}` };

  const customers = await prisma.partner.findMany({ where: { type: "CUSTOMER" } });
  const findCustomer = (name: string, phone: string) => {
    const digits = digitsOnly(phone);
    return (
      (digits.length >= 9 ? customers.find((c) => c.phone && digitsOnly(c.phone) === digits) : undefined) ??
      customers.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())
    );
  };

  const orderKey = (partnerId: string, delivery: string, order: string, qty: number) => `${partnerId}|${delivery}|${order}|${qty}`;
  const existingOrders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { partnerId: true, deliveryDate: true, orderDate: true, lines: { select: { quantity: true } } },
  });
  const seen = new Set(
    existingOrders.map((o) =>
      orderKey(
        o.partnerId,
        o.deliveryDate.toISOString().slice(0, 10),
        o.orderDate.toISOString().slice(0, 10),
        o.lines.reduce((s, l) => s + l.quantity, 0)
      )
    )
  );

  if (mode === "import" && setDefaults) {
    const ids = Array.from(new Set(productBySize.values()));
    // ตั้งเฉพาะสินค้าที่ยังไม่มีราคา ไม่ทับราคาที่ตั้งไว้แล้ว
    await prisma.product.updateMany({ where: { id: { in: ids }, defaultSellPrice: null }, data: { defaultSellPrice: price } });
    if (cost >= 0) await prisma.product.updateMany({ where: { id: { in: ids }, defaultCostPrice: null }, data: { defaultCostPrice: cost } });
  }

  const sourceCache = new Map<string, string | null>();
  const sourceFor = async (channel: string) => {
    const name = channel.trim();
    if (!name) return null;
    const key = name.toLowerCase();
    if (sourceCache.has(key)) return sourceCache.get(key)!;
    const found = (await prisma.customerSource.findMany()).find((s) => s.name.toLowerCase() === key);
    const id =
      found?.id ??
      (mode === "import"
        ? (
            await prisma.customerSource.create({
              data: { name, channel: /facebook|line|ig|instagram|tiktok|online|เฟส|ไลน์/i.test(name) ? "ONLINE" : "OFFLINE" },
            })
          ).id
        : null);
    sourceCache.set(key, id);
    return id;
  };

  const out: PreviewRow[] = [];
  let imported = 0;

  for (const row of sheet.rows) {
    const qty = Object.values(row.sizes).reduce((a, b) => a + b, 0);
    const orderDate = row.orderDate ?? row.deliveryDate;
    const base = { rowNo: row.rowNo, name: row.name, sizes: row.sizes, orderDate, deliveryDate: row.deliveryDate };
    if (row.errors.length > 0) {
      out.push({ ...base, customer: "existing", skip: row.errors.join(", ") });
      continue;
    }

    let customer = findCustomer(row.name, row.phone);
    const isNew = !customer;
    const key = (partnerId: string) => orderKey(partnerId, row.deliveryDate!, orderDate!, qty);

    if (customer && seen.has(key(customer.id))) {
      out.push({ ...base, customer: "existing", skip: "มีออเดอร์นี้ในระบบแล้ว (ลูกค้า วันที่ และจำนวนตรงกัน)" });
      continue;
    }
    if (mode === "preview") {
      out.push({ ...base, customer: isNew ? "new" : "existing", skip: null });
      continue;
    }

    try {
      if (!customer) {
        const coords = row.mapUrl ? await coordsFromMapLink(row.mapUrl) : null;
        customer = await prisma.partner.create({
          data: {
            name: row.name,
            type: "CUSTOMER",
            phone: row.phone || null,
            address: row.address || null,
            mapUrl: row.mapUrl || null,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
            sourceId: await sourceFor(row.channel),
          },
        });
        customers.push(customer); // แถวถัดไปของลูกค้าคนเดียวกันจะจับคู่เจอ
      }
      const lines = Object.entries(row.sizes).map(([header, quantity]) => ({
        productId: productBySize.get(header)!,
        quantity,
        unitPrice: price,
      }));
      const deliveryDate = new Date(row.deliveryDate!);
      await prisma.order.create({
        data: {
          partner: { connect: { id: customer.id } },
          warehouse: { connect: { id: warehouseId } },
          orderDate: new Date(orderDate!),
          deliveryDate,
          deliveryRound: round,
          note: "นำเข้าจาก Excel",
          status: delivered ? "DELIVERED" : "CONFIRMED",
          ...(delivered
            ? {
                deliveredAt: deliveryDate,
                paidAt: paid ? deliveryDate : null,
                movement: {
                  create: {
                    type: "OUT" as const,
                    partner: { connect: { id: customer.id } },
                    warehouse: { connect: { id: warehouseId } },
                    deliveryMethod: "DELIVERY" as const,
                    date: deliveryDate,
                    note: "นำเข้าจาก Excel",
                    lines: {
                      create: lines.map((l) => ({ product: { connect: { id: l.productId } }, quantity: l.quantity, unitPrice: l.unitPrice })),
                    },
                  },
                },
              }
            : {}),
          lines: {
            create: lines.map((l) => ({
              product: { connect: { id: l.productId } },
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              deliveredQuantity: delivered ? l.quantity : null,
            })),
          },
        },
      });
      seen.add(key(customer.id));
      imported++;
      out.push({ ...base, customer: isNew ? "new" : "existing", skip: null });
    } catch {
      out.push({ ...base, customer: isNew ? "new" : "existing", skip: "บันทึกไม่สำเร็จ" });
    }
  }

  if (mode === "import") {
    for (const p of ["/orders", "/driver", "/movements", "/reports", "/customers", "/customers/list", "/partners", "/"]) revalidatePath(p);
  }
  return { mode, rows: out, sizeHeaders: sheet.sizeHeaders, imported, defaultsSet: mode === "import" && setDefaults };
}
