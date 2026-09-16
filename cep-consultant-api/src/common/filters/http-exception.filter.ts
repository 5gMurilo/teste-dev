import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Response } from "express";
import { CircuitOpenError } from "../../cep/resilience/circuit-breaker.js";
import {
  CepNotFoundError,
  CepProviderUnavailableError,
} from "../provider-errors.js";

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof CepNotFoundError) {
      return response.status(404).json({
        statusCode: 404,
        message: exception.message,
        provider: exception.provider,
      });
    }

    if (exception instanceof CircuitOpenError) {
      return response.status(503).json({
        statusCode: 503,
        message: exception.message,
      });
    }

    if (exception instanceof CepProviderUnavailableError) {
      return response.status(503).json({
        statusCode: 503,
        message: exception.message,
      });
    }

    throw exception;
  }
}
