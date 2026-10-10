import { prisma } from "./prisma";
import { todayInBangkok } from "./delivery";

export type PeriodView = "day" | "month" | "year";

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
const keyPattern: Record<PeriodView, RegExp> = {
  day: /^\d{4}-\d{2}-\d{2}$/,
  month: /^\d{4}-\d{2}$/,
  year: /^\d{4}$/,
};

// วันที่ตามเวลาไทยในรูป yyyy-mm-dd รองรับทั้งค่าเที่ยงคืน UTC ที่เก็บจากฟอร์ม และเวลาจริงจาก now()
export function bkkDay(d: Date) {
  return new Date(d.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

export function defaultKey(view: PeriodView) {
  const today = todayInBangkok();
  return view === "day" ? today : view === "month" ? today.slice(0, 7) : today.slice(0, 4);
}

export function parseView(raw: string | undefined): PeriodView | null {
  return raw === "day" || raw === "month" || raw === "year" ? raw : null;
}

export function parseKey(view: PeriodView, raw: string | undefined) {
  return raw && keyPattern[view].test(raw) ? raw : defaultKey(view);
}

const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const shortMonthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// ปีแสดงเป็น ค.ศ. ตามที่ใช้ทั้งระบบ
export function keyLabel(view: PeriodView, key: string) {
  const [y, m, d] = key.split("-");
  if (view === "year") return y;
  if (view === "month") return `${monthNames[Number(m) - 1]} ${y}`;
  return `${d}/${m}/${y}`;
}

export const shortMonth = (m: number) => shortMonthNames[m - 1];

export type PeriodOption = { key: string; label: string; count: number };

export type SizeRow = { label: string; qty: number; revenue: number; cost: number };

export type PeriodOrder = {
  id: string;
  status: "CONFIRMED" | "DELIVERED" | "FAILED" | "CANCELLED";
  round: string;
  customer: string;
  lines: { label: string; quantity: number; delivered: number | null }[];
  total: number;
  paid: boolean;
  issueReason: string | null;
};

export type PeriodReport = {
  view: PeriodView;
  key: string;
  options: PeriodOption[];
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  qty: number;
  orderCounts: { total: number; delivered: number; pending: number; failed: number };
  pendingValue: number;
  unpaid: { count: number; amount: number };
  sizes: SizeRow[];
  topCustomers: { name: string; revenue: number; qty: number }[];
  expenseByCategory: { category: string; amount: number }[];
  // กราฟแท่ง: รายวันในเดือน หรือรายเดือนในปี
  series: { label: string; revenue: number; profit: number }[];
  orders: PeriodOrder[]; // เฉพาะมุมมองรายวัน
  issues: PeriodOrder[]; // ส่งไม่ครบ/ส่งไม่ได้ ในช่วงนี้
};

const inPeriod = (dayKey: string, key: string) => dayKey.startsWith(key);

export async function buildPeriodReport(view: PeriodView, key: string): Promise<PeriodReport> {
  const [movements, orders, expenses] = await Promise.all([
    prisma.movement.findMany({
      include: { partner: true, order: { select: { id: true } }, lines: { include: { product: true } } },
    }),
    prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { partner: true, lines: { include: { product: true } } },
    }),
    prisma.expense.findMany(),
  ]);

  // ต้นทุนเฉลี่ยต่อหน่วยจากการรับเข้าทั้งหมด วิธีเดียวกับหน้าภาพรวมและหน้าการเงิน
  const inbound = new Map<string, { qty: number; cost: number }>();
  for (const m of movements) {
    if (m.type !== "IN") continue;
    for (const l of m.lines) {
      const cur = inbound.get(l.productId) ?? { qty: 0, cost: 0 };
      cur.qty += l.quantity;
      cur.cost += l.quantity * l.unitPrice;
      inbound.set(l.productId, cur);
    }
  }
  const avgCost = (productId: string) => {
    const e = inbound.get(productId);
    return e && e.qty > 0 ? e.cost / e.qty : 0;
  };

  const productLabel = (p: { name: string; size: string | null }) => (p.size ? `${p.size} · ${p.name}` : p.name);

  // ตัวเลือกใน dropdown: ช่วงที่มีออเดอร์/ใบขาย/ค่าใช้จ่าย พร้อมจำนวนรายการ
  const dayCounts = new Map<string, number>();
  const bump = (day: string) => dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  for (const o of orders) bump(bkkDay(o.deliveryDate));
  for (const m of movements) if (m.type === "OUT" && !m.order) bump(bkkDay(m.date));
  for (const e of expenses) if (!dayCounts.has(bkkDay(e.date))) dayCounts.set(bkkDay(e.date), 0);
  dayCounts.set(defaultKey("day"), dayCounts.get(defaultKey("day")) ?? 0);

  const optionMap = new Map<string, number>();
  for (const [day, count] of dayCounts) {
    const k = view === "day" ? day : view === "month" ? day.slice(0, 7) : day.slice(0, 4);
    optionMap.set(k, (optionMap.get(k) ?? 0) + count);
  }
  optionMap.set(key, optionMap.get(key) ?? 0);
  const options = Array.from(optionMap, ([k, count]) => ({ key: k, label: keyLabel(view, k), count })).sort((a, b) =>
    b.key.localeCompare(a.key)
  );

  // ยอดขาย: นับจากใบขายออกตามวันที่ส่งจริง
  const sizeMap = new Map<string, SizeRow>();
  const customerMap = new Map<string, { name: string; revenue: number; qty: number }>();
  const seriesMap = new Map<string, { revenue: number; profit: number }>();
  let revenue = 0;
  let cogs = 0;
  let qty = 0;

  for (const m of movements) {
    if (m.type !== "OUT") continue;
    const day = bkkDay(m.date);
    if (!inPeriod(day, key)) continue;
    const seriesKey = view === "month" ? day : day.slice(0, 7);
    for (const l of m.lines) {
      const lineRevenue = l.quantity * l.unitPrice;
      const lineCost = l.quantity * avgCost(l.productId);
      revenue += lineRevenue;
      cogs += lineCost;
      qty += l.quantity;

      const label = productLabel(l.product);
      const size = sizeMap.get(label) ?? { label, qty: 0, revenue: 0, cost: 0 };
      size.qty += l.quantity;
      size.revenue += lineRevenue;
      size.cost += lineCost;
      sizeMap.set(label, size);

      const customer = customerMap.get(m.partnerId) ?? { name: m.partner.name, revenue: 0, qty: 0 };
      customer.revenue += lineRevenue;
      customer.qty += l.quantity;
      customerMap.set(m.partnerId, customer);

      const point = seriesMap.get(seriesKey) ?? { revenue: 0, profit: 0 };
      point.revenue += lineRevenue;
      point.profit += lineRevenue - lineCost;
      seriesMap.set(seriesKey, point);
    }
  }

  const expenseMap = new Map<string, number>();
  let expenseTotal = 0;
  for (const e of expenses) {
    if (!inPeriod(bkkDay(e.date), key)) continue;
    expenseTotal += e.amount;
    expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + e.amount);
  }

  // ออเดอร์: นับตามวันที่ส่งที่นัดไว้
  const periodOrders = orders.filter((o) => inPeriod(bkkDay(o.deliveryDate), key));
  const orderValue = (o: (typeof orders)[number]) =>
    o.lines.reduce((s, l) => s + (o.status === "DELIVERED" ? (l.deliveredQuantity ?? l.quantity) : l.quantity) * l.unitPrice, 0);
  const toView = (o: (typeof orders)[number]): PeriodOrder => ({
    id: o.id,
    status: o.status,
    round: o.deliveryRound,
    customer: o.partner.name,
    lines: o.lines.map((l) => ({ label: productLabel(l.product), quantity: l.quantity, delivered: l.deliveredQuantity })),
    total: orderValue(o),
    paid: !!o.paidAt,
    issueReason: o.issueReason,
  });

  const delivered = periodOrders.filter((o) => o.status === "DELIVERED");
  const pending = periodOrders.filter((o) => o.status === "CONFIRMED");
  const failed = periodOrders.filter((o) => o.status === "FAILED");
  const unpaid = delivered.filter((o) => !o.paidAt);

  // แกนกราฟให้ครบทุกวัน/ทุกเดือน แม้ช่วงนั้นไม่มียอด
  const series: PeriodReport["series"] = [];
  if (view === "month") {
    const [y, m] = key.split("-").map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= days; d++) {
      const k = `${key}-${String(d).padStart(2, "0")}`;
      series.push({ label: String(d), ...(seriesMap.get(k) ?? { revenue: 0, profit: 0 }) });
    }
  } else if (view === "year") {
    for (let m = 1; m <= 12; m++) {
      const k = `${key}-${String(m).padStart(2, "0")}`;
      series.push({ label: shortMonth(m), ...(seriesMap.get(k) ?? { revenue: 0, profit: 0 }) });
    }
  }

  return {
    view,
    key,
    options,
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    expenses: expenseTotal,
    netProfit: revenue - cogs - expenseTotal,
    qty,
    orderCounts: { total: periodOrders.length, delivered: delivered.length, pending: pending.length, failed: failed.length },
    pendingValue: pending.reduce((s, o) => s + orderValue(o), 0),
    unpaid: { count: unpaid.length, amount: unpaid.reduce((s, o) => s + orderValue(o), 0) },
    sizes: Array.from(sizeMap.values()).sort((a, b) => b.qty - a.qty),
    topCustomers: Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    expenseByCategory: Array.from(expenseMap, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    series,
    orders:
      view === "day"
        ? periodOrders
            .slice()
            .sort((a, b) => a.deliveryRound.localeCompare(b.deliveryRound) || a.createdAt.getTime() - b.createdAt.getTime())
            .map(toView)
        : [],
    issues: periodOrders
      .filter((o) => o.status === "FAILED" || (o.status === "DELIVERED" && o.issueReason))
      .map(toView),
  };
}
