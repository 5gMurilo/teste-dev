import type { CepProvider } from "../providers/cep.provider.js";
import { CepRoundRobinSelection } from "./cep-round-robin.strategy.js";

function buildProvider(name: string): CepProvider {
  return { findByCep: vi.fn(), name } as unknown as CepProvider;
}

describe("CepRoundRobinSelection", () => {
  it("returns the full array reordered starting from the current index", () => {
    const strategy = new CepRoundRobinSelection();
    const providers = [
      buildProvider("a"),
      buildProvider("b"),
      buildProvider("c"),
    ];

    const result = strategy.select(providers);

    expect(result).toEqual(providers);
  });

  it("advances the index on each call, cycling through all providers, wrapping around", () => {
    const strategy = new CepRoundRobinSelection();
    const [a, b, c] = [
      buildProvider("a"),
      buildProvider("b"),
      buildProvider("c"),
    ];
    const providers = [a, b, c];

    expect(strategy.select(providers)).toEqual([a, b, c]);
    expect(strategy.select(providers)).toEqual([b, c, a]);
    expect(strategy.select(providers)).toEqual([c, a, b]);
    expect(strategy.select(providers)).toEqual([a, b, c]);
  });

  it("returns an empty array for empty input without advancing or throwing", () => {
    const strategy = new CepRoundRobinSelection();
    const providers = [buildProvider("a"), buildProvider("b")];

    expect(() => strategy.select([])).not.toThrow();
    expect(strategy.select([])).toEqual([]);

    expect(strategy.select(providers)).toEqual(providers);
  });
});
