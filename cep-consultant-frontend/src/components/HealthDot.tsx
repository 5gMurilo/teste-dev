import { useEffect, useState } from "react";
import { checkHealth } from "../lib/api.js";

const POLL_INTERVAL_MS = 15_000;

type Status = "unknown" | "up" | "down";

const LABELS: Record<Status, string> = {
  unknown: "Verificando a API…",
  up: "API disponível",
  down: "API indisponível",
};

export function HealthDot() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function poll() {
      const ok = await checkHealth(controller.signal);
      if (active) setStatus(ok ? "up" : "down");
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  return (
    <p className="health" aria-live="polite">
      <span
        className={`health__dot health__dot--${status}`}
        aria-hidden="true"
      />
      {LABELS[status]}
    </p>
  );
}
