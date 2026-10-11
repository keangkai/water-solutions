// รอบจัดส่ง เก็บเป็นคีย์ในออเดอร์ แก้รายการรอบได้ที่นี่ที่เดียว
// 12:00–13:00 พักกินข้าว จึงไม่มีรอบช่วงนั้น
export const DELIVERY_ROUNDS = [
  { key: "08-10", label: "08:00–10:00" },
  { key: "10-12", label: "10:00–12:00" },
  { key: "13-15", label: "13:00–15:00" },
  { key: "15-17", label: "15:00–17:00" },
] as const;

export function roundLabel(key: string) {
  return DELIVERY_ROUNDS.find((r) => r.key === key)?.label ?? key;
}

export function isDeliveryRound(key: string) {
  return DELIVERY_ROUNDS.some((r) => r.key === key);
}

export const orderStatusInfo = {
  CONFIRMED: { label: "รอส่ง", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  DELIVERED: { label: "ส่งแล้ว", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED: { label: "ส่งไม่ได้", badge: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "ยกเลิก", badge: "bg-slate-50 text-slate-500 border-slate-200" },
} as const;

export type OrderStatus = keyof typeof orderStatusInfo;

// วันที่ปัจจุบันตามเวลาไทยในรูป yyyy-mm-dd เพราะ server อาจรันด้วยเวลา UTC
export function todayInBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

// วันที่ตามเวลาไทยของค่าเวลาใดๆ (รองรับทั้งเที่ยงคืน UTC ที่เก็บจากฟอร์ม และเวลาจริงจาก now())
export function bkkDay(d: Date) {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// วันที่ในฐานข้อมูลเก็บเป็นเที่ยงคืน UTC ของวันนั้น เหมือนใบขายออก
export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function shiftDateKey(key: string, days: number) {
  const d = new Date(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKey(d);
}

// ออเดอร์ใหม่เลือกวันส่งย้อนหลังได้ไม่เกินกี่วัน (ไว้บันทึกออเดอร์ที่ส่งไปแล้วย้อนหลัง)
export const BACKDATE_DAYS = 15;

// วันส่งที่เก่าสุดที่อนุญาตสำหรับออเดอร์ใหม่ ตามเวลาไทย (yyyy-mm-dd)
export function earliestDeliveryDate(today: string = todayInBangkok()) {
  return shiftDateKey(today, -BACKDATE_DAYS);
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
