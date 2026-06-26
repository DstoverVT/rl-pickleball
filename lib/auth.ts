"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "admin_session";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "rocketlab";

function makeToken(password: string): string {
  const buf = Buffer.from(`pickleball:${password}`);
  return buf.toString("base64");
}

export async function login(password: string): Promise<boolean> {
  if (password !== ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/");
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token === makeToken(ADMIN_PASSWORD);
}

export async function requireAdmin() {
  const ok = await isAdmin();
  if (!ok) redirect("/admin/login");
}
