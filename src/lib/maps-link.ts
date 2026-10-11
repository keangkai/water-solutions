export type Coords = { latitude: number; longitude: number };

const ALLOWED_HOSTS = new Set(["maps.app.goo.gl", "goo.gl", "google.com", "www.google.com", "maps.google.com"]);

function validCoords(lat: number, lng: number): Coords | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

// อ่านพิกัดจากข้อความที่วางมา: ลิงก์ Google Maps เต็ม หรือพิมพ์ "13.7563, 100.5018"
export function parseCoords(text: string): Coords | null {
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2C)(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) {
      const coords = validCoords(Number(m[1]), Number(m[2]));
      if (coords) return coords;
    }
  }
  return null;
}

function isAllowed(url: URL) {
  return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
}

// ลิงก์ย่อ (maps.app.goo.gl) ต้องตามไปอ่านลิงก์ปลายทาง ตามเฉพาะโดเมนของ Google เพื่อกันถูกใช้ยิงไปที่อื่น
async function expandShortLink(link: string): Promise<string | null> {
  let current: URL;
  try {
    current = new URL(link);
  } catch {
    return null;
  }
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowed(current)) return null;
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(5000) }).catch(() => null);
    const location = res?.headers.get("location");
    if (!res || !location) return current.toString();
    try {
      current = new URL(location, current);
    } catch {
      return null;
    }
    if (parseCoords(current.toString())) return current.toString();
  }
  return null;
}

export async function coordsFromMapLink(input: string): Promise<Coords | null> {
  const direct = parseCoords(input);
  if (direct) return direct;
  const expanded = await expandShortLink(input.trim());
  return expanded ? parseCoords(expanded) : null;
}
