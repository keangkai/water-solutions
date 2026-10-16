import { facebookNameIfDifferent } from "./customer-labels";

// กฎเลือกคู่ค้าของใบรับเข้า/ขายออก อยู่ที่ฝั่ง server ที่นี่ที่เดียว
// หน้าจอรับรายการที่กรองแล้วไปแสดงเฉยๆ และ server action ใช้กฎเดียวกันตรวจก่อนบันทึก
export type MovementKind = "IN" | "OUT";
export type PartnerKind = "SUPPLIER" | "CUSTOMER";

// ใบรับเข้าซื้อจากซัพพลายเออร์ ใบขายออกขายให้ลูกค้า
export const partnerTypeFor: Record<MovementKind, PartnerKind> = { IN: "SUPPLIER", OUT: "CUSTOMER" };

const kindLabel: Record<PartnerKind, string> = { SUPPLIER: "ซัพพลายเออร์", CUSTOMER: "ลูกค้า" };

export type PartnerOption = { id: string; label: string };
export type PartnerOptions = Record<MovementKind, PartnerOption[]>;

// keepPartnerId = คู่ค้าเดิมของใบที่กำลังแก้ ถ้าเป็นข้อมูลเก่าที่ประเภทไม่ตรงกฎ จะยังเลือกต่อได้และมีป้ายประเภทกำกับ
export function partnerOptionsFor(
  partners: { id: string; name: string; type: PartnerKind; facebookName?: string | null }[],
  keepPartnerId?: string
): PartnerOptions {
  const build = (kind: MovementKind): PartnerOption[] =>
    partners
      .filter((p) => p.type === partnerTypeFor[kind] || p.id === keepPartnerId)
      .map((p) => {
        const fbName = facebookNameIfDifferent(p.name, p.facebookName);
        const fb = fbName ? ` · FB: ${fbName}` : "";
        return { id: p.id, label: p.type === partnerTypeFor[kind] ? `${p.name}${fb}` : `${p.name} (${kindLabel[p.type]})${fb}` };
      });
  return { IN: build("IN"), OUT: build("OUT") };
}
