import { ApiProperty } from "@nestjs/swagger";
import { IsValidCep } from "../decorators/isValidCep.decorator.js";

export class CepDTO {
  @ApiProperty({
    example: "12345678",
    description: "Brazilian postal code (CEP)",
    type: String,
    required: true,
    minLength: 8,
    maxLength: 9,
  })
  @IsValidCep()
  cep: string;
}
