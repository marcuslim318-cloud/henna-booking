import { NextRequest, NextResponse } from "next/server";
import { validAdminPassword } from "@/lib/admin";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  if (username !== "admin" || !validAdminPassword(password || "")) return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("henna_admin", `${"admin"}.${await sign("admin")}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}

async function sign(value: string) {
  const { createHmac } = await import("node:crypto");
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is missing");
  return createHmac("sha256", secret).update(value).digest("hex");
}
