import { Inject, Injectable } from "@nestjs/common";
import { CEP_PROVIDER, type CepProvider } from "./providers/cep.provider.js";

@Injectable()
export class CepService {
  @Inject(CEP_PROVIDER)
  private readonly cepProvider: CepProvider;

  findByCep(cep: string) {
    return this.cepProvider.findByCep(cep);
  }
}
