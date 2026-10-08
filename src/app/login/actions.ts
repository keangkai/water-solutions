"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, SESSION_MAX_AGE } from "@/lib/session-role";

export async function login(_: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!validUsername || !validPassword || !secret) {
    return { error: "ยังไม่ได้ตั้งค่า AUTH environment variables" };
  }

  // บัญชีคนขับเปิดใช้เมื่อตั้งค่า DRIVER_USERNAME และ DRIVER_PASSWORD (เซ็น session ด้วย AUTH_SECRET เหมือน admin)
  const driverUsername = process.env.DRIVER_USERNAME;
  const driverPassword = process.env.DRIVER_PASSWORD;
  const isAdmin = username === validUsername && password === validPassword;
  const isDriver =
    !!driverUsername && !!driverPassword && username === driverUsername && password === driverPassword;

  if (!isAdmin && !isDriver) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const cookieStore = await cookies();
  cookieStore.set("session", await createSession(isAdmin ? "admin" : "driver", secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(isAdmin ? "/" : "/driver");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
