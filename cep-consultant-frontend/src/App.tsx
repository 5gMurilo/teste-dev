import { useState } from "react";
import { AddressCard } from "./components/AddressCard.js";
import { CepForm } from "./components/CepForm.js";
import { DevTerminalMount } from "./components/dev/DevTerminalMount.js";
import { ErrorMessage } from "./components/ErrorMessage.js";
import { Header } from "./components/Header.js";
import { HealthDot } from "./components/HealthDot.js";
import { CepLookupError, lookupCep } from "./lib/api.js";
import { CEP_PATTERN } from "./lib/cep.js";
import { UNEXPECTED_ERROR_MESSAGE } from "./lib/errors.js";
import { AppState, CepAddress } from "./lib/types.js";

export function App({ appState }: { appState: AppState }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<CepAddress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  async function handleSubmit() {
    setTouched(true);
    setLoading(true);
    setError(null);
    setAddress(null);
    try {
      setAddress(await lookupCep(value));
    } catch (caught) {
      setError(
        caught instanceof CepLookupError
          ? caught.message
          : UNEXPECTED_ERROR_MESSAGE,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app" data-dev-tools={appState.devTools ? "on" : "off"}>
      <main className="app__main">
        <Header />
        <CepForm
          value={value}
          loading={loading}
          invalid={touched && value !== "" && !CEP_PATTERN.test(value)}
          onChange={(next) => {
            setValue(next);
            setTouched(false);
          }}
          onSubmit={handleSubmit}
        />
        {error && <ErrorMessage message={error} />}
        {address && <AddressCard address={address} />}
      </main>
      <footer className="app__footer">
        <HealthDot />
      </footer>
      <DevTerminalMount appState={appState} />
    </div>
  );
}
