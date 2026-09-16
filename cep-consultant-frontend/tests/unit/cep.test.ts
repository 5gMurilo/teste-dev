import { describe, expect, it } from "vitest";
import {
  CEP_PATTERN,
  formatCepMask,
  isValidCep,
  normalizeCep,
} from "../../src/lib/cep.js";

describe("CEP_PATTERN", () => {
  it.each(["01001000", "01001-000", "99999-999"])("aceita %s", (value) => {
    expect(CEP_PATTERN.test(value)).toBe(true);
  });

  it.each([
    "123",
    "0100100",
    "010010000",
    "0100a-000",
    "abcdefgh",
    "",
    "01001–000",
  ])("rejeita %s", (value) => {
    expect(CEP_PATTERN.test(value)).toBe(false);
  });
});

describe("isValidCep", () => {
  it("ignora espaços nas extremidades", () => {
    expect(isValidCep("  01001-000  ")).toBe(true);
  });

  it("rejeita valor incompleto", () => {
    expect(isValidCep("123")).toBe(false);
  });
});

describe("normalizeCep", () => {
  it("produz o mesmo resultado com e sem hífen", () => {
    expect(normalizeCep("01001-000")).toBe("01001000");
    expect(normalizeCep("01001000")).toBe("01001000");
  });

  it("remove espaços", () => {
    expect(normalizeCep(" 01001 - 000 ")).toBe("01001000");
  });
});

describe("formatCepMask", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["01001", "01001"],
    ["010010", "01001-0"],
    ["01001000", "01001-000"],
    ["01001-000", "01001-000"],
    ["010010009999", "01001-000"],
    ["abc01001000", "01001-000"],
  ])("mascara %s como %s", (input, expected) => {
    expect(formatCepMask(input)).toBe(expected);
  });
});
