import type { ValidationError } from '@nestjs/common';
import { BLANK_MESSAGE } from '../constants/error-messages.constants.js';
import type { ApiErrors } from '../errors/api-errors.js';

const BLANK_CONSTRAINTS = new Set(['isDefined', 'isNotEmpty']);

export const formatValidationErrors = (
  errors: ValidationError[],
): ApiErrors => {
  const result: ApiErrors = {};
  const visit = (error: ValidationError): void => {
    const constraints = error.constraints ?? {};
    const names = Object.keys(constraints);
    if (names.length > 0) {
      result[error.property] = names.some((name) => BLANK_CONSTRAINTS.has(name))
        ? [BLANK_MESSAGE]
        : Object.values(constraints);
    }
    error.children?.forEach(visit);
  };
  errors.forEach(visit);
  return result;
};
