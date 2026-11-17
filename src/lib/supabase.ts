const baseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl || !serviceKey) throw new Error("Supabase environment variables are missing");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase request failed: ${response.status}`);
  return (text ? JSON.parse(text) : null) as T;
}

export async function storage(path: string, init: RequestInit = {}) {
  if (!baseUrl || !serviceKey) throw new Error("Supabase environment variables are missing");
  const response = await fetch(`${baseUrl}/storage/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase storage request failed: ${response.status}`);
  return text ? JSON.parse(text) : null;
}
