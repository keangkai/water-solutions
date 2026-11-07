import { classifyBehavior, type BehaviorStatus } from "@/lib/customer-behavior";

// กลุ่มที่นับเป็น "ลูกค้าที่หายไป": เลยรอบซื้อ, เงียบนานกว่า 2 เท่าของรอบ, ซื้อครั้งเดียวแล้วไม่กลับมา
export type LapsedStatus = Extract<BehaviorStatus, "OVERDUE" | "AT_RISK" | "ONE_TIME">;
export const lapsedStatuses: LapsedStatus[] = ["OVERDUE", "AT_RISK", "ONE_TIME"];

// ซื้อล่าสุดไม่ถึงกี่วันยังไม่นับว่าหาย (กันคนที่ซื้อติดกันหลายวันจนรอบเฉลี่ยสั้นผิดจริง)
const MIN_SILENT_DAYS = 14;
// ต้องซื้อมากี่วันขึ้นไปจึงเชื่อรอบซื้อเฉลี่ยพอจะประมาณยอดต่อเดือน
const MIN_PURCHASE_DAYS_FOR_ESTIMATE = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type MovementInput = { date: Date; lines: { productName: string; quantity: number; unitPrice: number }[] };

export type LapsedInput = {
  id: string;
  name: string;
  phone: string | null;
  zone: string | null;
  isBlacklisted: boolean;
  hasPendingOrder: boolean; // มีออเดอร์รอส่งอยู่แล้ว ไม่ต้องโทรตาม
  movements: MovementInput[];
};

export type LapsedCustomer = {
  id: string;
  name: string;
  phone: string | null;
  zone: string | null;
  isBlacklisted: boolean;
  status: LapsedStatus;
  daysSinceLast: number;
  avgGapDays: number | null;
  daysOverdue: number | null; // เลยรอบมากี่วัน (ซื้อครั้งเดียวไม่มีรอบ)
  lastDate: Date;
  lastItems: string; // สิ่งที่สั่งในครั้งล่าสุด ใช้เปิดบทสนทนาตอนโทรตาม
  orders: number;
  total: number; // ยอดซื้อสะสมทั้งหมด
  monthlyValue: number | null; // ประมาณการยอดต่อเดือนที่เสียไป = ยอดเฉลี่ยต่อใบ × 30 / รอบซื้อเฉลี่ย
};

export function buildLapsedCustomers(inputs: LapsedInput[], now = Date.now()): LapsedCustomer[] {
  const result: LapsedCustomer[] = [];
  for (const c of inputs) {
    if (c.hasPendingOrder || c.movements.length === 0) continue;
    const behavior = classifyBehavior(
      c.movements.map((m) => m.date),
      now
    );
    if (!(lapsedStatuses as BehaviorStatus[]).includes(behavior.status) || behavior.daysSinceLast == null) continue;
    if (behavior.daysSinceLast < MIN_SILENT_DAYS) continue;
    const purchaseDays = new Set(c.movements.map((m) => Math.floor(m.date.getTime() / DAY_MS))).size;

    const latest = c.movements.reduce((a, b) => (b.date > a.date ? b : a));
    const items = new Map<string, number>();
    for (const l of latest.lines) items.set(l.productName, (items.get(l.productName) ?? 0) + l.quantity);

    const total = c.movements.reduce((sum, m) => sum + m.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), 0);
    const avgOrder = total / c.movements.length;

    result.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      zone: c.zone,
      isBlacklisted: c.isBlacklisted,
      status: behavior.status as LapsedStatus,
      daysSinceLast: behavior.daysSinceLast,
      avgGapDays: behavior.avgGapDays,
      daysOverdue: behavior.avgGapDays != null ? Math.max(0, behavior.daysSinceLast - behavior.avgGapDays) : null,
      lastDate: latest.date,
      lastItems: [...items.entries()].map(([name, qty]) => `${name} × ${qty.toLocaleString()}`).join(", "),
      orders: c.movements.length,
      total,
      monthlyValue: behavior.avgGapDays != null && purchaseDays >= MIN_PURCHASE_DAYS_FOR_ESTIMATE ? Math.round((avgOrder * 30) / behavior.avgGapDays) : null,
    });
  }
  return result;
}
