import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: Array<{ field: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) ?? message;
        code = (resp.error as string) ?? code;

        // Handle class-validator errors
        if (Array.isArray(resp.message)) {
          details = (resp.message as string[]).map((msg) => ({
            field: 'unknown',
            message: msg,
          }));
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log server errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const correlationId = (request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        correlationId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
