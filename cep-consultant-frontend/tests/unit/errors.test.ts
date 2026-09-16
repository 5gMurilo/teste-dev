import { describe, expect, it } from "vitest";
import {
  ERROR_MESSAGES,
  messageForStatus,
  UNEXPECTED_ERROR_MESSAGE,
} from "../../src/lib/errors.js";

describe("messageForStatus", () => {
  it.each([400, 404, 408, 503])("tem mensagem dedicada para %i", (status) => {
    expect(messageForStatus(status)).toBe(ERROR_MESSAGES[status]);
  });

  it("produz mensagens distintas para cada status mapeado", () => {
    const messages = [400, 404, 408, 503].map(messageForStatus);
    expect(new Set(messages).size).toBe(4);
  });

  it.each([418, 500, 502, 0])("usa a mensagem genérica para %i", (status) => {
    expect(messageForStatus(status)).toBe(UNEXPECTED_ERROR_MESSAGE);
  });
});
