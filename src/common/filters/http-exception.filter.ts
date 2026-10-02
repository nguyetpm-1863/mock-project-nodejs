import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  GENERIC_ERROR_FIELD,
  INTERNAL_ERROR_MESSAGE,
  RESOURCE_ERROR_FIELD,
} from '../constants/error-messages.constants.js';
import { type ApiErrors, isApiErrorsBody } from '../errors/api-errors.js';

const RESOURCE_STATUSES = new Set<number>([
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
]);

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

    response.status(status).json({ errors: this.toErrors(exception, status) });
  }

  private toErrors(exception: unknown, status: number): ApiErrors {
    if (!(exception instanceof HttpException)) {
      return { [GENERIC_ERROR_FIELD]: [INTERNAL_ERROR_MESSAGE] };
    }
    const body = exception.getResponse();
    if (isApiErrorsBody(body)) {
      return body.errors;
    }
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? body.message
        : exception.message;
    const field = RESOURCE_STATUSES.has(status)
      ? RESOURCE_ERROR_FIELD
      : GENERIC_ERROR_FIELD;
    return {
      [field]: Array.isArray(message) ? message.map(String) : [String(message)],
    };
  }
}
