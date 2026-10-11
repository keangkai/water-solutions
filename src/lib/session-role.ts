export type Role = "admin" | "driver";

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // วินาที

const encoder = new TextEncoder();

// ใช้ Web Crypto เพื่อให้ทำงานได้ทั้งใน proxy และ server action
async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// session cookie = "role.หมดอายุ(ms).ลายเซ็น HMAC" เซ็นด้วย AUTH_SECRET
// cookie จึงไม่เก็บ secret ตรงๆ และปลอมสิทธิ์หรือยืดอายุเองไม่ได้
export async function createSession(role: Role, secret: string) {
  const payload = `${role}.${Date.now() + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function roleForSession(session: string | undefined): Promise<Role | null> {
  const secret = process.env.AUTH_SECRET;
  if (!session || !secret) return null;

  const [role, expires, signature] = session.split(".");
  if ((role !== "admin" && role !== "driver") || !expires || !signature) return null;
  if (!(Number(expires) > Date.now())) return null;

  const expected = await sign(`${role}.${expires}`, secret);
  return safeEqual(signature, expected) ? role : null;
}
