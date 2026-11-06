import { apiUrl } from "./baseUrl";

export type ApiHealth = "up" | "down" | "unreachable";

const TIMEOUT_MS = 5000;

/**
 * Asks the backend whether it is healthy.
 * Never throws: network errors and timeouts are reported as "unreachable".
 */
export async function fetchApiHealth(): Promise<ApiHealth> {
  try {
    const response = await fetch(apiUrl("/actuator/health"), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return "down";
    }
    const body: unknown = await response.json();
    const status =
      typeof body === "object" && body !== null && "status" in body
        ? body.status
        : undefined;
    return status === "UP" ? "up" : "down";
  } catch {
    return "unreachable";
  }
}
