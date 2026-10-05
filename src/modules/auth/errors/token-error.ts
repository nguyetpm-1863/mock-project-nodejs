import { UnauthorizedException } from '@nestjs/common';
import { apiErrors } from '../../../common/errors/api-errors.js';
import { TOKEN_ERROR_FIELD } from '../constants/auth.constants.js';

export const tokenError = (message: string): UnauthorizedException =>
  new UnauthorizedException(apiErrors({ [TOKEN_ERROR_FIELD]: [message] }));
