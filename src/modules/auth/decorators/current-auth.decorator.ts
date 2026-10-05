import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../interfaces/auth-context.interface.js';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
