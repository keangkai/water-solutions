export const segmentLabel = {
  HOUSEHOLD: "บ้าน",
  GROCERY: "ร้านชำ",
  SHOP: "ร้านค้า",
  RESTAURANT: "ร้านอาหาร",
  OFFICE: "ออฟฟิศ",
  FACTORY: "โรงงาน",
  OTHER: "อื่น ๆ",
} as const;

export const channelLabel = { OFFLINE: "ออฟไลน์", ONLINE: "ออนไลน์" } as const;

export const deliveryLabel = { DELIVERY: "ไปส่งเอง", PICKUP: "ลูกค้ามารับที่คลัง" } as const;

export type CustomerSegment = keyof typeof segmentLabel;
export type ChannelType = keyof typeof channelLabel;
export type DeliveryMethod = keyof typeof deliveryLabel;

// ชื่อ Facebook แสดงเมื่อไม่ซ้ำกับชื่อหลัก (ถ้าเหมือนกันไม่ต้องแสดงซ้ำ)
export function facebookNameIfDifferent(name: string, facebookName: string | null | undefined) {
  const fb = facebookName?.trim();
  return fb && fb.toLowerCase() !== name.trim().toLowerCase() ? fb : null;
}
