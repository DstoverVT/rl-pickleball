import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "rocketlab";
const COOKIE_NAME = "admin_session";

function makeToken(password: string): string {
  return Buffer.from(`pickleball:${password}`).toString("base64");
}

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ ok: true });
}
