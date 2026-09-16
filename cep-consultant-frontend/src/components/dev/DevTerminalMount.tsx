import { lazy, Suspense, useState } from "react";
import { AppState } from "../../lib/types.js";

const TerminalPanel = import.meta.env.DEV
  ? lazy(() => import("./TerminalPanel.js"))
  : null;

export function DevTerminalMount({ appState }: { appState: AppState }) {
  const [open, setOpen] = useState(false);

  if (!appState.devTools || TerminalPanel === null) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="dev-terminal__toggle"
        aria-label="Abrir logs da API"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m6 9 3 3-3 3" />
          <path d="M13 15h5" />
        </svg>
      </button>
      {open && (
        <Suspense fallback={null}>
          <TerminalPanel
            limit={appState.devLogsClientLimit}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
