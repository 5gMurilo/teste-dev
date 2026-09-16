import { useEffect, useRef, useState } from "react";
import "./terminal.css";

const POLL_INTERVAL_MS = 1000;

const LEVEL_LABELS: Record<number, string> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal",
};

interface ApiRecord {
  seq: number;
  time?: number;
  level?: number;
  msg?: string;
  event?: string;
  cep?: string;
  provider?: string;
  freshness?: string;
  attempt?: number;
}

interface Entry {
  key: number;
  kind: "record" | "gap";
  record?: ApiRecord;
}

type Status = "conectando" | "conectado" | "sem resposta";

function formatTime(time?: number): string {
  if (typeof time !== "number") return "--:--:--";
  return new Date(time).toLocaleTimeString("pt-BR", { hour12: false });
}

function levelName(level?: number): string {
  return typeof level === "number" ? (LEVEL_LABELS[level] ?? "log") : "log";
}

function fields(record: ApiRecord): string {
  const parts: string[] = [];
  if (record.event) parts.push(record.event);
  if (record.cep) parts.push(`cep=${record.cep}`);
  if (record.provider) parts.push(`provider=${record.provider}`);
  if (record.freshness) parts.push(`freshness=${record.freshness}`);
  if (typeof record.attempt === "number")
    parts.push(`attempt=${record.attempt}`);
  if (parts.length === 0 && record.msg) parts.push(record.msg);
  return parts.join(" · ");
}

export default function TerminalPanel({
  limit,
  onClose,
}: {
  limit: number;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<Status>("conectando");
  const listRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef(0);
  const keyRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function poll(): Promise<void> {
      let payload: {
        records?: ApiRecord[];
        nextSeq?: number;
        dropped?: boolean;
      };
      try {
        const response = await fetch(`/api/dev-logs?since=${sinceRef.current}`);
        if (!response.ok) throw new Error(String(response.status));
        payload = await response.json();
      } catch {
        if (active) setStatus("sem resposta");
        return;
      }

      if (!active) return;
      setStatus("conectado");

      if (typeof payload.nextSeq === "number") {
        sinceRef.current = payload.nextSeq;
      }

      const records = payload.records ?? [];
      if (records.length === 0 && !payload.dropped) return;

      setEntries((previous) => {
        const appended: Entry[] = [];
        if (payload.dropped) {
          keyRef.current += 1;
          appended.push({ key: keyRef.current, kind: "gap" });
        }
        for (const record of records) {
          keyRef.current += 1;
          appended.push({ key: keyRef.current, kind: "record", record });
        }
        const next = [...previous, ...appended];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [limit]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || entries.length === 0) return;
    list.scrollTop = list.scrollHeight;
  }, [entries.length]);

  return (
    <section className="dev-terminal" aria-label="Logs da API">
      <header className="dev-terminal__bar">
        <span className="dev-terminal__title">Logs da API</span>
        <span
          className={`dev-terminal__status dev-terminal__status--${
            status === "conectado" ? "ok" : "off"
          }`}
        >
          {status}
        </span>
        <button
          type="button"
          className="dev-terminal__close"
          aria-label="Fechar logs da API"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="dev-terminal__list" ref={listRef}>
        {entries.length === 0 && (
          <p className="dev-terminal__empty">
            Aguardando registros. Faça uma consulta de CEP.
          </p>
        )}
        {entries.map((entry) =>
          entry.kind === "gap" ? (
            <p key={entry.key} className="dev-terminal__gap">
              registros antigos descartados
            </p>
          ) : (
            <p key={entry.key} className="dev-terminal__line">
              <time className="dev-terminal__time">
                {formatTime(entry.record?.time)}
              </time>
              <span
                className={`dev-terminal__level dev-terminal__level--${levelName(
                  entry.record?.level,
                )}`}
              >
                {levelName(entry.record?.level)}
              </span>
              <span className="dev-terminal__fields">
                {fields(entry.record as ApiRecord)}
              </span>
            </p>
          ),
        )}
      </div>
    </section>
  );
}
