import { buildCepAddress } from "../../test/support/fake-cep-address.js";
import { CepService } from "./cep.service.js";

describe("CepService", () => {
  it("delegates findByCep to cepProvider and returns its resolved result", async () => {
    const address = buildCepAddress();
    const fakeCepProvider = { findByCep: vi.fn().mockResolvedValue(address) };
    const service = new CepService();
    Object.assign(service, { cepProvider: fakeCepProvider });

    const result = await service.findByCep("01310100");

    expect(fakeCepProvider.findByCep).toHaveBeenCalledWith("01310100");
    expect(result).toEqual(address);
  });

  it("propagates the rejection when cepProvider.findByCep rejects", async () => {
    const error = new Error("provider failed");
    const fakeCepProvider = { findByCep: vi.fn().mockRejectedValue(error) };
    const service = new CepService();
    Object.assign(service, { cepProvider: fakeCepProvider });

    await expect(service.findByCep("01310100")).rejects.toThrow(
      "provider failed",
    );
  });
});
