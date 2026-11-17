import { NextRequest, NextResponse } from "next/server";
import { validAdminPassword } from "@/lib/admin";
import { createHmac } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "管理员后台尚未完成安全配置。请在 Vercel 环境变量中添加 ADMIN_SESSION_SECRET 并重新部署。" }, { status: 503 });

  try {
    const { username, password } = await request.json();
    if (username !== "admin" || !validAdminPassword(password || "")) return NextResponse.json({ error: "账号或密码错误。" }, { status: 401 });
    const signature = createHmac("sha256", secret).update("admin").digest("hex");
    const response = NextResponse.json({ ok: true });
    response.cookies.set("henna_admin", `admin.${signature}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ error: "管理员登录暂时不可用，请稍后重试。" }, { status: 500 });
  }
}
