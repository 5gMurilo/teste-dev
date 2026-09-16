import { ApiProperty } from "@nestjs/swagger";

export class CepAddressResponseDto {
  @ApiProperty({ example: "12345678", description: "Brazilian postal code (CEP)" })
  cep: string;

  @ApiProperty({ example: "Rua Example", description: "Street name" })
  street: string;

  @ApiProperty({ example: "Centro", description: "Neighborhood" })
  neighborhood: string;

  @ApiProperty({ example: "São Paulo", description: "City name" })
  city: string;

  @ApiProperty({ example: "SP", description: "State abbreviation" })
  state: string;
}
