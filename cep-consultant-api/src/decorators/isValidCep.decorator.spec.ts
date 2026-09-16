import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CepDTO } from "../cep/cep.dto.js";

describe("IsValidCep", () => {
  it("normalizes a masked CEP to 8 digits and passes validation", async () => {
    const dto = plainToInstance(CepDTO, { cep: "01310-100" });

    const errors = await validate(dto);

    expect(dto.cep).toBe("01310100");
    expect(errors).toHaveLength(0);
  });

  it("passes with zero validation errors for a valid 8-digit CEP", async () => {
    const dto = plainToInstance(CepDTO, { cep: "01310100" });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("produces at least one validation error for an invalid CEP", async () => {
    const shortDto = plainToInstance(CepDTO, { cep: "123" });
    const longDto = plainToInstance(CepDTO, { cep: "123456789" });

    const shortErrors = await validate(shortDto);
    const longErrors = await validate(longDto);

    expect(shortErrors.length).toBeGreaterThan(0);
    expect(longErrors.length).toBeGreaterThan(0);
  });
});
