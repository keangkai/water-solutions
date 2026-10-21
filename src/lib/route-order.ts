import type { Coords } from "@/lib/maps-link";

// ระยะเส้นตรงระหว่างสองพิกัด (กม.) ใช้เรียงว่าใกล้หรือไกลเท่านั้น ไม่ใช่ระยะทางถนน
export function distanceKm(a: Coords, b: Coords) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// เรียงจากใกล้คลังไปไกล ถ้าไม่มีพิกัด (ของคลังหรือลูกค้า) ไว้ท้ายสุด โดยคงลำดับเดิมของกลุ่มนั้น
export function sortByDistance<T>(items: T[], origin: (item: T) => Coords | null, target: (item: T) => Coords | null) {
  const keyed = items.map((item, index) => {
    const from = origin(item);
    const to = target(item);
    return { item, index, km: from && to ? distanceKm(from, to) : null };
  });
  keyed.sort((a, b) => {
    if (a.km === null && b.km === null) return a.index - b.index;
    if (a.km === null) return 1;
    if (b.km === null) return -1;
    return a.km - b.km || a.index - b.index;
  });
  return keyed.map((k) => k.item);
}
