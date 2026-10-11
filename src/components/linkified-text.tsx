import { MapPin, ExternalLink } from "lucide-react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

// ลิงก์ Google Maps (ทั้งลิงก์ย่อ maps.app.goo.gl และลิงก์เต็ม) บนมือถือที่ติดตั้งแอป Google Maps จะเปิดเข้าแอปให้เอง
function isMapLink(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host === "goo.gl" && url.pathname.startsWith("/maps")) return true;
    return /(^|\.)google\.[a-z.]+$/.test(host) && url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

// แสดงข้อความ โดยลิงก์ http(s) ในข้อความกลายเป็นลิงก์ที่กดได้ (ลิงก์แผนที่แสดงเป็นปุ่ม "เปิดใน Google Maps")
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_RE); // ตำแหน่งคี่คือ URL ที่จับได้
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const trailing = /[),.;:!?]+$/.exec(part)?.[0] ?? "";
        const href = trailing ? part.slice(0, -trailing.length) : part;
        const map = isMapLink(href);
        return (
          <span key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 min-h-[44px] align-middle text-sky-600 hover:text-sky-700 hover:underline touch-manipulation"
            >
              {map ? <MapPin className="size-3.5 shrink-0" aria-hidden /> : <ExternalLink className="size-3.5 shrink-0" aria-hidden />}
              {map ? "เปิดใน Google Maps" : "เปิดลิงก์"}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
}
