import { cookies } from "next/headers";
import { roleForSession } from "./session-role";

export async function currentRole() {
  const cookieStore = await cookies();
  return roleForSession(cookieStore.get("session")?.value);
}

export async function isAdmin() {
  return (await currentRole()) === "admin";
}
