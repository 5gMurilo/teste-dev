import { hydrateRoot } from "react-dom/client";
import { App } from "./App.js";
import { AppState } from "./lib/types.js";
import "./styles/global.css";

declare global {
  interface Window {
    __APP_STATE__?: AppState;
  }
}

const appState: AppState = window.__APP_STATE__ ?? {
  devTools: false,
  devLogsClientLimit: 500,
};

hydrateRoot(
  document.getElementById("root") as HTMLElement,
  <App appState={appState} />,
);
