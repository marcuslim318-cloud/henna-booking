const ORIGIN = "https://henna-booking.vercel.app";

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, ORIGIN);

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;

  const upstream = await fetch(target, init);
  const out = new Headers(upstream.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.delete("transfer-encoding");

  const location = out.get("location");
  if (location && location.startsWith(ORIGIN)) {
    out.set("location", url.origin + location.slice(ORIGIN.length));
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
