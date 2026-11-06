import { prisma } from "@/lib/prisma";
import { buildLapsedCustomers, lapsedStatuses, type LapsedCustomer, type LapsedStatus } from "@/lib/lapsed-customers";

export const lapsedSortOptions = { value: "ยอดซื้อสะสมสูงสุด", overdue: "เลยรอบนานสุด", recent: "ซื้อล่าสุด" } as const;
export type LapsedSortKey = keyof typeof lapsedSortOptions;

export function parseLapsedSort(raw: string | null | undefined): LapsedSortKey {
  return raw && raw in lapsedSortOptions ? (raw as LapsedSortKey) : "value";
}

export function parseLapsedStatus(raw: string | null | undefined): LapsedStatus | null {
  return lapsedStatuses.find((s) => s === raw) ?? null;
}

export async function loadLapsedCustomers(): Promise<LapsedCustomer[]> {
  const partners = await prisma.partner.findMany({
    where: { type: "CUSTOMER", movements: { some: { type: "OUT" } } },
    select: {
      id: true,
      name: true,
      phone: true,
      zone: true,
      isBlacklisted: true,
      orders: { where: { status: { in: ["CONFIRMED", "FAILED"] } }, select: { id: true }, take: 1 },
      movements: {
        where: { type: "OUT" },
        select: { date: true, lines: { select: { quantity: true, unitPrice: true, product: { select: { name: true } } } } },
      },
    },
  });

  return buildLapsedCustomers(
    partners.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      zone: p.zone,
      isBlacklisted: p.isBlacklisted,
      hasPendingOrder: p.orders.length > 0,
      movements: p.movements.map((m) => ({
        date: m.date,
        lines: m.lines.map((l) => ({ productName: l.product.name, quantity: l.quantity, unitPrice: l.unitPrice })),
      })),
    }))
  );
}

export function filterAndSortLapsed(all: LapsedCustomer[], status: LapsedStatus | null, sort: LapsedSortKey) {
  return (status ? all.filter((c) => c.status === status) : [...all]).sort((a, b) => {
    if (sort === "overdue") return (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || b.total - a.total;
    if (sort === "recent") return b.lastDate.getTime() - a.lastDate.getTime();
    return b.total - a.total;
  });
}
