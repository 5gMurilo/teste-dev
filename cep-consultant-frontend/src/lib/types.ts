export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  provider?: string;
}

export interface AppState {
  devTools: boolean;
  devLogsClientLimit: number;
}
