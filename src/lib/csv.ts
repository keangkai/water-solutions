export type CsvCell = string | number | boolean | null | undefined;

// ข้อความที่ขึ้นต้นด้วยอักขระสูตร Excel (= + - @) ใส่ ' นำหน้า กันถูกตีความเป็นสูตรเมื่อเปิดไฟล์
// ตัวเลขจริงไม่โดนแก้ จึงยังเป็นค่าติดลบได้
function cell(value: CsvCell) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: CsvCell[][]) {
  // BOM ให้ Excel อ่านภาษาไทยถูก
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
