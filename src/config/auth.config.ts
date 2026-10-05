import { registerAs } from '@nestjs/config';
import { requireEnv } from './require-env.js';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: number;
}

export default registerAs('auth', (): AuthConfig => ({
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: Number(requireEnv('JWT_EXPIRES_IN')),
}));
