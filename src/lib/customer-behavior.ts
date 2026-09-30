const DAY_MS = 24 * 60 * 60 * 1000;

// ลูกค้าที่ซื้อครั้งแรกภายในกี่วันยังนับเป็นลูกค้าใหม่
const NEW_CUSTOMER_DAYS = 30;
// เหลืออีกกี่วันจะถึงรอบ ถือว่าใกล้ถึงรอบ ควรโทรเสนอ
const DUE_SOON_DAYS = 3;

export type BehaviorStatus = "DUE_SOON" | "OVERDUE" | "AT_RISK" | "NEW" | "ON_CYCLE" | "ONE_TIME" | "NEVER";

// เรียงจากกลุ่มที่ต้องทำอะไรก่อน
export const behaviorOrder: BehaviorStatus[] = ["DUE_SOON", "OVERDUE", "AT_RISK", "NEW", "ON_CYCLE", "ONE_TIME"];

export const behaviorInfo: Record<BehaviorStatus, { label: string; hint: string; badge: string }> = {
  DUE_SOON: {
    label: "ใกล้ถึงรอบ",
    hint: `จะถึงรอบสั่งภายใน ${DUE_SOON_DAYS} วัน โทรเสนอได้เลย`,
    badge: "bg-sky-50 text-sky-700 border-sky-200",
  },
  OVERDUE: {
    label: "เลยรอบ",
    hint: "เลยรอบซื้อปกติแล้ว ควรโทรตาม",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  AT_RISK: {
    label: "เสี่ยงหาย",
    hint: "เงียบนานกว่า 2 เท่าของรอบปกติ",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  NEW: {
    label: "ลูกค้าใหม่",
    hint: `ซื้อครั้งแรกใน ${NEW_CUSTOMER_DAYS} วันที่ผ่านมา ติดตามให้ซื้อซ้ำ`,
    badge: "bg-violet-50 text-violet-700 border-violet-200",
  },
  ON_CYCLE: {
    label: "ซื้อตามรอบ",
    hint: "ซื้อสม่ำเสมอ ยังไม่ถึงรอบถัดไป",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ONE_TIME: {
    label: "ซื้อครั้งเดียว",
    hint: `ซื้อครั้งเดียวแล้วไม่กลับมาเกิน ${NEW_CUSTOMER_DAYS} วัน`,
    badge: "bg-slate-50 text-slate-600 border-slate-200",
  },
  NEVER: {
    label: "ยังไม่เคยซื้อ",
    hint: "มีรายชื่อแต่ยังไม่มีใบขาย",
    badge: "bg-slate-50 text-slate-400 border-slate-200",
  },
};

// จัดกลุ่มพฤติกรรมจากวันที่ซื้อทั้งหมดของลูกค้า โดยเทียบกับรอบซื้อเฉลี่ยของลูกค้ารายนั้นเอง
export function classifyBehavior(orderDates: Date[], now = Date.now()) {
  if (orderDates.length === 0) {
    return { status: "NEVER" as BehaviorStatus, avgGapDays: null, daysSinceLast: null, nextExpected: null };
  }

  // หลายใบในวันเดียวกันนับเป็นการซื้อรอบเดียว ไม่ให้รอบซื้อเฉลี่ยสั้นผิดจริง
  const times = Array.from(new Set(orderDates.map((d) => Math.floor(d.getTime() / DAY_MS) * DAY_MS))).sort((a, b) => a - b);
  const first = times[0];
  const last = times[times.length - 1];
  const daysSinceLast = Math.max(0, Math.floor((now - last) / DAY_MS));

  if (times.length === 1) {
    const status: BehaviorStatus = daysSinceLast <= NEW_CUSTOMER_DAYS ? "NEW" : "ONE_TIME";
    return { status, avgGapDays: null, daysSinceLast, nextExpected: null };
  }

  const avgGapDays = Math.max(1, Math.round((last - first) / DAY_MS / (times.length - 1)));
  const daysUntilNext = avgGapDays - daysSinceLast;
  const status: BehaviorStatus =
    daysUntilNext > DUE_SOON_DAYS
      ? "ON_CYCLE"
      : daysUntilNext >= 0
        ? "DUE_SOON"
        : daysSinceLast <= avgGapDays * 2
          ? "OVERDUE"
          : "AT_RISK";

  return { status, avgGapDays, daysSinceLast, nextExpected: new Date(last + avgGapDays * DAY_MS) };
}
