import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number | null =>
    context.switchToHttp().getRequest<Partial<AuthenticatedRequest>>().auth
      ?.payload.sub ?? null,
);
