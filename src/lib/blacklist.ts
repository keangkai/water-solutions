import type { IncidentKind } from "@/generated/prisma/client";

export const incidentLabel: Record<IncidentKind, string> = {
  CANCELLED: "ลูกค้ายกเลิก",
  NO_ANSWER: "ไม่รับสาย / ติดต่อไม่ได้",
};

// ประวัติในช่วงนี้นับเป็น "ปัญหาล่าสุด" และถ้าถึงจำนวนนี้ ระบบแนะนำให้พิจารณาขึ้นบัญชีดำ (ไม่ขึ้นให้เอง)
export const INCIDENT_WINDOW_DAYS = 90;
export const INCIDENT_SUGGEST_COUNT = 2;

// เหตุผลที่คนขับเลือกตอนกด "ส่งไม่ได้" แปลงเป็นชนิดเหตุการณ์ของลูกค้า
// "หาที่อยู่ไม่เจอ" ไม่นับ เพราะไม่ใช่ความผิดของลูกค้า
export function incidentKindForReason(reason: string): IncidentKind | null {
  if (/ยกเลิก/.test(reason)) return "CANCELLED";
  if (/ไม่อยู่|โทรไม่ติด|ไม่รับสาย|ติดต่อไม่ได้/.test(reason)) return "NO_ANSWER";
  return null;
}

export const blacklistPresets = ["ยกเลิกออเดอร์บ่อย", "ไม่รับสายบ่อย", "ไม่อยู่ตอนส่งบ่อย", "ไม่รับของ / ไม่จ่ายเงิน"];
