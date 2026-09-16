import { applyDecorators } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Matches } from "class-validator";

export function IsValidCep() {
  return applyDecorators(
    ApiProperty({
      example: "12345678",
      name: "cep",
      description: "Brazilian postal code",
      type: String,
      required: true,
      minLength: 8,
      maxLength: 9,
    }),
    Transform(({ value }: { value: string }) => value?.replace(/\D/g, "")),
    IsString(),
    IsNotEmpty(),
    Matches(/^\d{8}$/, { message: "CEP inválido, deve conter 8 dígitos" }),
  );
}
