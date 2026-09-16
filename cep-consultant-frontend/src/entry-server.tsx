import { renderToString } from "react-dom/server";
import { App } from "./App.js";
import { AppState } from "./lib/types.js";

export interface RenderResult {
  html: string;
  head: string;
}

/** Evita que `</script>` dentro do JSON encerre a tag inline. */
function serializeState(state: AppState): string {
  return JSON.stringify(state).replace(/</g, "\\u003c");
}

export function render(state: AppState): RenderResult {
  return {
    html: renderToString(<App appState={state} />),
    head: `<script>window.__APP_STATE__ = ${serializeState(state)};</script>`,
  };
}
