import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiRequestTimeoutResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../common/dto/error-response.dto.js";
import { CepDTO } from "./cep.dto.js";
import { CepAddressResponseDto } from "./dto/cep-address-response.dto.js";
import { CepService } from "./cep.service.js";

@ApiTags("CEP")
@Controller("cep")
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get(":cep")
  @ApiOperation({ summary: "Find address by CEP" })
  @ApiParam({
    name: "cep",
    description: "Brazilian postal code (CEP)",
    type: String,
    example: "12345678",
    required: true,
  })
  @ApiOkResponse({
    description: "Address found successfully",
    type: CepAddressResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Address not found",
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Invalid CEP",
    type: ErrorResponseDto,
  })
  @ApiRequestTimeoutResponse({
    description: "Request timeout",
    type: ErrorResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: "CEP provider unavailable or circuit breaker open",
    type: ErrorResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: "Rate limit exceeded",
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error",
    type: ErrorResponseDto,
  })
  findByCep(@Param() cepDto: CepDTO) {
    return this.cepService.findByCep(cepDto.cep);
  }
}
