import type { Request } from 'express';
import type { AuthContext } from './auth-context.interface.js';

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
