import { ApiProperty } from "@nestjs/swagger";

class CircuitBreakerHealthDto {
  @ApiProperty({ example: "CLOSED", description: "Circuit breaker state (CLOSED, OPEN, HALF_OPEN)" })
  breaker: string;
}

class CircuitBreakersHealthDto {
  @ApiProperty({ type: CircuitBreakerHealthDto, description: "ViaCEP provider circuit breaker" })
  viaCep: CircuitBreakerHealthDto;

  @ApiProperty({ type: CircuitBreakerHealthDto, description: "BrasilAPI provider circuit breaker" })
  brasilApi: CircuitBreakerHealthDto;
}

class CacheHealthDto {
  @ApiProperty({ example: 42, description: "Number of cached entries" })
  size: number;

  @ApiProperty({ example: 10, description: "Number of cache hits" })
  hits: number;

  @ApiProperty({ example: 5, description: "Number of cache misses" })
  misses: number;
}

class FallbackHealthDto {
  @ApiProperty({ example: 3, description: "Number of fallback activations" })
  activations: number;

  @ApiProperty({ example: "Via-CEP", description: "Current primary provider" })
  primaryProvider: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: "ok", description: "Overall service status" })
  status: string;

  @ApiProperty({ example: "2024-01-01T00:00:00.000Z", description: "ISO 8601 timestamp" })
  timestamp: string;

  @ApiProperty({ type: CircuitBreakersHealthDto, description: "Circuit breakers status per provider" })
  circuitBreakers: CircuitBreakersHealthDto;

  @ApiProperty({ type: CacheHealthDto, description: "Cache statistics" })
  cache: CacheHealthDto;

  @ApiProperty({ type: FallbackHealthDto, description: "Fallback statistics" })
  fallback: FallbackHealthDto;
}
