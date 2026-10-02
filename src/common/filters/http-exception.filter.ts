import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(exception, AllExceptionsFilter.name);
    }

    response.status(status).json({
      errors: { body: this.toMessages(exception) },
    });
  }

  private toMessages(exception: unknown): string[] {
    if (!(exception instanceof HttpException)) {
      return ['Internal server error'];
    }
    const body = exception.getResponse();
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? body.message
        : exception.message;
    return Array.isArray(message) ? message.map(String) : [String(message)];
  }
}
