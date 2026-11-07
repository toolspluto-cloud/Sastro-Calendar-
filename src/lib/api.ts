/** Fetch JSON for screens. Network failures and error statuses both reject. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** Smooth scrolling, unless the viewer asked for reduced motion. */
export function gentleScroll(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
