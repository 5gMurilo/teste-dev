export const CEP_PATTERN = /^\d{5}-?\d{3}$/;

export function isValidCep(value: string): boolean {
  return CEP_PATTERN.test(value.trim());
}

export function normalizeCep(value: string): string {
  return value.replace(/\s/g, "").replace(/-/g, "");
}

export function formatCepMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
