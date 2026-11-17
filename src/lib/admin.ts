import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "henna_admin";

function signature(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is missing");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function validAdminPassword(password: string) {
  return password === (process.env.ADMIN_PASSWORD || "6767");
}

export function isAdmin() {
  const raw = cookies().get(cookieName)?.value || "";
  const [value, supplied] = raw.split(".");
  if (value !== "admin" || !supplied) return false;
  const expected = signature(value);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
