import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? "pickleball";
const COOKIE_NAME = "site_session";

function makeToken(password: string): string {
  return Buffer.from(`site:${password}`).toString("base64");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== SITE_PASSWORD) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return NextResponse.json({ ok: true });
}
