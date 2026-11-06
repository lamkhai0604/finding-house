/**
 * T-114b / D-030: where the API lives. Empty (the default, and in development) means the same
 * origin as the page, through the Vite proxy. A deployed build sets VITE_API_BASE_URL to the
 * backend's origin, e.g. https://finding-house-api.onrender.com.
 */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  return `${base}${path}`;
}
