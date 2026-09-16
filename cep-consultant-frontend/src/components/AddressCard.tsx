import { CepAddress } from "../lib/types.js";

const FIELDS: ReadonlyArray<[keyof CepAddress, string]> = [
  ["cep", "CEP"],
  ["street", "Logradouro"],
  ["neighborhood", "Bairro"],
  ["city", "Cidade"],
  ["state", "Estado"],
];

export function AddressCard({ address }: { address: CepAddress }) {
  return (
    <section className="address-card" aria-live="polite">
      <h2 className="address-card__title">Endereço encontrado</h2>
      <dl className="address-card__list">
        {FIELDS.map(([key, label]) => (
          <div className="address-card__item" key={key}>
            <dt>{label}</dt>
            <dd>{address[key] || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
