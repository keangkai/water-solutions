import type { Coords } from "@/lib/maps-link";

type PartnerAddresses = {
  address: string | null;
  mapUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  address2: string | null;
  address2Label: string | null;
  mapUrl2: string | null;
  latitude2: number | null;
  longitude2: number | null;
};

export type ResolvedAddress = { address: string | null; mapUrl: string | null; coords: Coords | null; label: string | null };

const coordsOf = (latitude: number | null, longitude: number | null): Coords | null =>
  latitude != null && longitude != null ? { latitude, longitude } : null;

export function hasSecondAddress(partner: Pick<PartnerAddresses, "address2" | "mapUrl2">) {
  return !!(partner.address2 || partner.mapUrl2);
}

// ที่อยู่ที่ใช้ส่งจริงของออเดอร์: ที่อยู่ที่กรอกเฉพาะออเดอร์ > ที่อยู่ที่ 2 ของลูกค้า (ถ้าเลือก) > ที่อยู่หลัก
// ที่อยู่ที่กรอกเองไม่มีลิงก์แผนที่/พิกัด เพื่อไม่ให้ปุ่มนำทางพาไปที่อยู่ของลูกค้าผิดที่
export function resolveDeliveryAddress(
  order: { deliveryAddress: string | null; useSecondAddress: boolean },
  partner: PartnerAddresses
): ResolvedAddress {
  if (order.deliveryAddress) return { address: order.deliveryAddress, mapUrl: null, coords: null, label: null };
  if (order.useSecondAddress && hasSecondAddress(partner)) {
    return {
      address: partner.address2,
      mapUrl: partner.mapUrl2,
      coords: coordsOf(partner.latitude2, partner.longitude2),
      label: partner.address2Label ?? "ที่อยู่ที่ 2",
    };
  }
  return { address: partner.address, mapUrl: partner.mapUrl, coords: coordsOf(partner.latitude, partner.longitude), label: null };
}
