export type Role = "admin" | "driver";

// แยกสิทธิ์จากค่า session cookie: admin ใช้ AUTH_SECRET, คนขับใช้ DRIVER_SECRET
export function roleForSession(session: string | undefined): Role | null {
  if (!session) return null;
  if (process.env.AUTH_SECRET && session === process.env.AUTH_SECRET) return "admin";
  if (process.env.DRIVER_SECRET && session === process.env.DRIVER_SECRET) return "driver";
  return null;
}
