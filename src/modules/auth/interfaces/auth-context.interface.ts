import type { User } from '../../users/entities/user.entity.js';
import type { JwtPayload } from './jwt-payload.interface.js';

export interface AuthContext {
  payload: JwtPayload;
  token: string;
  user: User;
}
