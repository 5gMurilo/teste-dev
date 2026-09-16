import { ApiProperty } from "@nestjs/swagger";

export class ErrorResponseDto {
  @ApiProperty({ example: 400, description: "HTTP status code" })
  statusCode: number;

  @ApiProperty({ example: "Bad Request", description: "Error message" })
  message: string;

  @ApiProperty({ example: "CEP inválido, deve conter 8 dígitos", description: "Detailed error message", required: false })
  error?: string;
}
