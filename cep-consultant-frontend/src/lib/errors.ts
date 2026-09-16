export const ERROR_MESSAGES: Record<number, string> = {
  400: "CEP em formato inválido. Informe 8 dígitos, como 01001-000.",
  404: "CEP não encontrado.",
  408: "Tempo de consulta esgotado. Tente novamente em instantes.",
  503: "Serviço de consulta indisponível no momento.",
};

export const UNEXPECTED_ERROR_MESSAGE =
  "Ocorreu um erro inesperado ao consultar o CEP.";

export function messageForStatus(status: number): string {
  return ERROR_MESSAGES[status] ?? UNEXPECTED_ERROR_MESSAGE;
}
