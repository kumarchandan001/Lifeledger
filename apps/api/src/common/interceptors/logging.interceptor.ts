import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') ?? 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        if (process.env.NODE_ENV === 'production') {
          const logPayload = {
            timestamp: new Date().toISOString(),
            context: 'HTTP',
            method,
            url,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
          };
          if (duration > 3000) {
            this.logger.warn(JSON.stringify({ ...logPayload, level: 'warn', message: `🐌 SLOW: ${method} ${url}` }));
          } else {
            this.logger.log(JSON.stringify({ ...logPayload, level: 'info' }));
          }
        } else {
          const logMessage = `${method} ${url} ${statusCode} ${duration}ms - ${ip} ${userAgent}`;
          if (duration > 3000) {
            this.logger.warn(`🐌 SLOW: ${logMessage}`);
          } else {
            this.logger.log(logMessage);
          }
        }
      }),
    );
  }
}
