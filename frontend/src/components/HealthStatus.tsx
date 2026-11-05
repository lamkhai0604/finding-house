import { useEffect, useState } from "react";
import { fetchApiHealth, type ApiHealth } from "../api/health";

const LABELS: Record<ApiHealth | "checking", string> = {
  checking: "Checking API…",
  up: "API is up",
  down: "API is down",
  unreachable: "API is unreachable",
};

/** Shows whether the backend API answers its health check. */
export function HealthStatus() {
  const [health, setHealth] = useState<ApiHealth | "checking">("checking");

  useEffect(() => {
    let active = true;
    fetchApiHealth().then((result) => {
      if (active) {
        setHealth(result);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <p role="status" className={`health health-${health}`}>
      {LABELS[health]}
    </p>
  );
}
