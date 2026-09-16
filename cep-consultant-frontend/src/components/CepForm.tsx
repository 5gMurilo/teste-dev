import { FormEvent } from "react";
import { CEP_PATTERN, formatCepMask } from "../lib/cep.js";

interface CepFormProps {
  value: string;
  loading: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CepForm({
  value,
  loading,
  invalid,
  onChange,
  onSubmit,
}: CepFormProps) {
  const canSubmit = CEP_PATTERN.test(value) && !loading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  }

  return (
    <form className="cep-form" onSubmit={handleSubmit} noValidate>
      <label className="cep-form__label" htmlFor="cep">
        Digite o CEP
      </label>
      <div className="cep-form__row">
        <input
          id="cep"
          name="cep"
          className="cep-form__input"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="01001-000"
          maxLength={9}
          value={value}
          aria-invalid={invalid}
          aria-describedby="cep-hint"
          onChange={(event) => onChange(formatCepMask(event.target.value))}
        />
        <button
          className="cep-form__submit"
          type="submit"
          disabled={!canSubmit}
        >
          {loading ? "Consultando…" : "Consultar"}
        </button>
      </div>
      <p className="cep-form__hint" id="cep-hint">
        Oito dígitos, com ou sem hífen.
      </p>
    </form>
  );
}
