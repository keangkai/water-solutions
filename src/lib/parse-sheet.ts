// อ่านตารางออเดอร์ที่คัดลอกมาจาก Excel (คั่นด้วย tab) ใช้ได้ทั้งฝั่ง browser และ server

// แยกเซลล์แบบ TSV ที่รองรับเซลล์มีเครื่องหมายคำพูดและขึ้นบรรทัดใหม่ในเซลล์ (ที่อยู่หลายบรรทัด)
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// เดือน/วัน/ปี (Excel ฝั่งอเมริกา) ปี พ.ศ. แปลงเป็น ค.ศ. คืนค่า yyyy-mm-dd
export function parseSheetDate(raw: string): string | null {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

// "1500 ml" / "1.5L" / "600ml" → จำนวน ml ใช้เดาว่าตรงกับสินค้าขนาดไหน
export function sizeToMl(raw: string | null | undefined): number | null {
  const m = /(\d+(?:\.\d+)?)\s*(ml|มล|l|ลิตร)/i.exec(raw ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  return /^(l|ลิตร)$/i.test(m[2]) ? Math.round(n * 1000) : n;
}

export type SheetRow = {
  rowNo: number; // เลขแถวใน Excel (ไม่นับหัวตาราง)
  name: string;
  facebookName: string; // คอลัมน์ "ชื่อ Facebook" (ถ้ามี)
  phone: string;
  sizes: Record<string, number>; // หัวคอลัมน์ขนาด → จำนวนแพ็ค
  orderDate: string | null;
  deliveryDate: string | null;
  address: string;
  channel: string;
  mapUrl: string;
  errors: string[];
};

export type ParsedSheet = { sizeHeaders: string[]; rows: SheetRow[]; error?: string };

export function parseOrderSheet(text: string): ParsedSheet {
  const table = parseTsv(text);
  if (table.length < 2) return { sizeHeaders: [], rows: [], error: "วางตารางพร้อมหัวคอลัมน์ (แถวแรก) และข้อมูลอย่างน้อย 1 แถว" };

  const header = table[0].map((h) => h.trim());
  const find = (label: string) => header.findIndex((h) => h.includes(label));
  const idx = {
    // "ชื่อ" = ชื่อจริง ต้องไม่ใช่คอลัมน์ชื่อ Facebook
    name: header.findIndex((h) => h.includes("ชื่อ") && !/facebook|เฟส/i.test(h)),
    facebookName: header.findIndex((h) => /facebook|เฟส/i.test(h) && h.includes("ชื่อ")),
    phone: find("เบอร์"),
    total: find("รวม"),
    orderDate: find("วันที่สั่ง"),
    deliveryDate: find("วันที่ส่ง"),
    address: find("ที่อยู่"),
    channel: find("ช่องทาง"),
  };
  const sizeCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => sizeToMl(h) !== null && /^\d/.test(h));

  const missing = (["name", "deliveryDate"] as const).filter((k) => idx[k] < 0);
  if (missing.length > 0 || sizeCols.length === 0) {
    return { sizeHeaders: [], rows: [], error: "ไม่พบคอลัมน์ ชื่อ / วันที่ส่ง / ขนาดน้ำ (เช่น 600 ml) ในแถวแรก" };
  }

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  const rows = table.slice(1).map((r, n): SheetRow => {
    const errors: string[] = [];
    const sizes: Record<string, number> = {};
    for (const { h, i } of sizeCols) {
      const raw = cell(r, i);
      if (raw === "") continue;
      const q = Number(raw.replace(/,/g, ""));
      if (!Number.isInteger(q) || q < 0) errors.push(`จำนวน ${h} ไม่ถูกต้อง (${raw})`);
      else if (q > 0) sizes[h] = q;
    }
    const sum = Object.values(sizes).reduce((a, b) => a + b, 0);
    if (sum === 0 && errors.length === 0) errors.push("ไม่มีจำนวนสินค้า");
    const totalRaw = cell(r, idx.total);
    if (totalRaw !== "" && Number(totalRaw) !== sum && errors.length === 0) errors.push(`รวมจำนวนในไฟล์ (${totalRaw}) ไม่ตรงกับผลรวมขนาด (${sum})`);

    const orderDate = idx.orderDate >= 0 ? parseSheetDate(cell(r, idx.orderDate)) : null;
    const deliveryDate = parseSheetDate(cell(r, idx.deliveryDate));
    if (!deliveryDate) errors.push(`วันที่ส่งไม่ถูกต้อง (${cell(r, idx.deliveryDate) || "ว่าง"})`);
    if (idx.orderDate >= 0 && cell(r, idx.orderDate) !== "" && !orderDate) errors.push(`วันที่สั่งไม่ถูกต้อง (${cell(r, idx.orderDate)})`);

    const name = cell(r, idx.name);
    if (!name) errors.push("ไม่มีชื่อลูกค้า");

    return {
      rowNo: n + 1,
      name,
      facebookName: cell(r, idx.facebookName),
      phone: cell(r, idx.phone),
      sizes,
      orderDate,
      deliveryDate,
      address: cell(r, idx.address),
      channel: cell(r, idx.channel),
      mapUrl: r.map((c) => c.trim()).find((c) => /^https?:\/\//i.test(c)) ?? "",
      errors,
    };
  });

  return { sizeHeaders: sizeCols.map((c) => c.h), rows };
}
