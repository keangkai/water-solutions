// อ่านข้อความออเดอร์ที่ admin ส่งมาทางไลน์ แล้วแยกเป็นข้อมูลออเดอร์ ไม่เดา: บรรทัดที่อ่านไม่ได้เก็บไว้ใน unparsed
// ตัวอย่าง:
//   รับออเดอร์ครับคุณลูกค้า
//   คุณมด
//   063-2316890
//   1500ml =30 แพค
//   พิกัด เอื้ออาทร...
//   หมุด google map: https://maps.app.goo.gl/...
//   ส่ง 31/10 รอบ 18.00

export type ParsedLine = { sizeKey: string; sizeText: string; quantity: number };
export type ParsedDate = { day: number; month: number; year: number | null } | { relative: "today" | "tomorrow" };
export type ParsedTime = { start: number; end: number | null };

export type ParsedLineOrder = {
  name: string | null;
  phone: string | null;
  lines: ParsedLine[];
  address: string | null;
  mapUrl: string | null;
  date: ParsedDate | null;
  time: ParsedTime | null;
  unparsed: string[];
};

const PHONE = /(0\d{1,2})[-\s.]?(\d{3})[-\s.]?(\d{4})/;
const URL_RE = /https?:\/\/\S+/;
const LINE_ITEM = /^\s*(\d+(?:\.\d+)?)\s*(ml|มล\.?|ลิตร|l|cc)\s*(?:=|:|x|×|\*)\s*(\d+)\s*(?:แพค|แพ็ค|แพ็ก|pack|ลัง)?\s*$/i;
const DATE_RE = /(?:ส่ง(?:\s*วันที่)?\s*)?(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*[/\-.]\s*(\d{2,4}))?/;
const TIME_RE = /รอบ\s*(?:เวลา\s*)?(\d{1,2})(?:[.:](\d{2}))?(?:\s*(?:-|–|ถึง)\s*(\d{1,2})(?:[.:](\d{2}))?)?/;

// ขนาดน้ำเป็นมิลลิลิตร 1.5L = 1500ml ใช้เทียบกับ product.size ที่เก็บเป็นข้อความ
export function sizeKey(raw: string): string | null {
  const m = raw.toLowerCase().replace(/\s+/g, "").match(/^(\d+(?:\.\d+)?)(ml|มล\.?|l|ลิตร|cc)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const ml = m[2] === "l" || m[2] === "ลิตร" ? n * 1000 : n;
  return `${Math.round(ml)}ml`;
}

export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

// แยกข้อความที่วางมาเป็นรายออเดอร์ ตามคำว่า "รับออเดอร์" (ไม่มีคำนี้ถือเป็นออเดอร์เดียว)
export function splitOrders(text: string): string[] {
  const parts = text.split(/(?=^.*รับออเดอร์)/m).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [];
}

export function parseLineOrder(chunk: string): ParsedLineOrder {
  const result: ParsedLineOrder = { name: null, phone: null, lines: [], address: null, mapUrl: null, date: null, time: null, unparsed: [] };

  for (const rawLine of chunk.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    if (/รับออเดอร์/.test(line)) continue; // บรรทัดหัวข้อ

    const url = URL_RE.exec(line);
    if (url) {
      result.mapUrl ??= url[0].replace(/[),.]+$/, "");
      continue;
    }

    const item = LINE_ITEM.exec(line);
    if (item) {
      const key = sizeKey(`${item[1]}${item[2]}`);
      if (key) {
        result.lines.push({ sizeKey: key, sizeText: `${item[1]}${item[2]}`, quantity: Number(item[3]) });
        continue;
      }
    }

    if (/^(พิกัด|ที่อยู่|ส่งที่)/.test(line)) {
      const address = line.replace(/^(พิกัด|ที่อยู่|ส่งที่)\s*[:：]?\s*/, "").trim();
      if (address) result.address = result.address ? `${result.address}\n${address}` : address;
      continue;
    }

    const isDeliveryLine = /^ส่ง/.test(line) || /รอบ/.test(line);
    if (isDeliveryLine) {
      const rel = /พรุ่งนี้/.test(line) ? "tomorrow" : /วันนี้/.test(line) ? "today" : null;
      const date = DATE_RE.exec(line.replace(TIME_RE, " "));
      if (rel) result.date = { relative: rel };
      else if (date) result.date = { day: Number(date[1]), month: Number(date[2]), year: date[3] ? Number(date[3]) : null };
      const time = TIME_RE.exec(line);
      if (time) result.time = { start: Number(time[1]), end: time[3] ? Number(time[3]) : null };
      if (rel || date || time) continue;
    }

    // เบอร์โทร (อาจอยู่บรรทัดเดียวกับชื่อ)
    const phone = PHONE.exec(line);
    if (phone && !result.phone) {
      result.phone = `${phone[1]}-${phone[2]}-${phone[3]}`;
      line = line.replace(phone[0], "").replace(/[()\-:]/g, " ").trim();
      if (!line) continue;
    }

    // บรรทัดแรกที่เหลือคือชื่อลูกค้า
    if (!result.name) {
      result.name = line;
      continue;
    }

    result.unparsed.push(rawLine.trim());
  }

  return result;
}

// รอบจากเวลาที่ลูกค้าบอก: ช่วงเวลา "17-19" ตรงกับรอบนั้นเลย เวลาเดียว (18.00) ใช้รอบที่คลุมเวลานั้น
// ไม่มีรอบคลุม (เช่น ช่วงพัก 12–13) ใช้รอบที่เริ่มใกล้ที่สุด คืน null ถ้าไม่ได้ระบุเวลา
export function roundFromTime(time: ParsedTime | null, roundKeys: readonly string[]): string | null {
  if (!time) return null;
  const ranges = roundKeys.map((key) => {
    const [s, e] = key.split("-").map(Number);
    return { key, start: s, end: e };
  });
  if (time.end != null) {
    const exact = ranges.find((r) => r.start === time.start && r.end === time.end);
    if (exact) return exact.key;
  }
  const covering = ranges.find((r) => time.start >= r.start && time.start < r.end);
  if (covering) return covering.key;
  return [...ranges].sort((a, b) => Math.abs(a.start - time.start) - Math.abs(b.start - time.start))[0]?.key ?? null;
}

function isRealDate(y: number, m: number, d: number) {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, "0");

// วันส่ง (yyyy-mm-dd) ปีไม่ระบุ = ปีปัจจุบัน ถ้าเก่ากว่าที่อนุญาต (earliest) ถือเป็นปีหน้า ปี พ.ศ. แปลงเป็น ค.ศ.
// today / shift ส่งเข้ามาเพื่อไม่ผูกกับเวลาเครื่อง คืน null ถ้าอ่านเป็นวันที่ไม่ได้
export function resolveDate(
  date: ParsedDate | null,
  today: string,
  earliest: string,
  addDays: (key: string, days: number) => string
): string | null {
  if (!date) return null;
  if ("relative" in date) return date.relative === "today" ? today : addDays(today, 1);
  let year = date.year;
  if (year != null) {
    if (year < 100) year += 2000;
    if (year > 2400) year -= 543;
    return isRealDate(year, date.month, date.day) ? `${year}-${pad(date.month)}-${pad(date.day)}` : null;
  }
  const thisYear = Number(today.slice(0, 4));
  if (!isRealDate(thisYear, date.month, date.day)) return null;
  const candidate = `${thisYear}-${pad(date.month)}-${pad(date.day)}`;
  if (candidate >= earliest) return candidate;
  return isRealDate(thisYear + 1, date.month, date.day) ? `${thisYear + 1}-${pad(date.month)}-${pad(date.day)}` : null;
}
