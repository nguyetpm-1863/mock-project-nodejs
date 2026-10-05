import Joi from 'joi';
import { DEFAULT_AUTH_RATE_LIMIT } from '../common/constants/app.constants.js';
import {
  DEFAULT_JWT_EXPIRES_IN_SECONDS,
  JWT_SECRET_MIN_LENGTH,
} from '../modules/auth/constants/auth.constants.js';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  swaggerEnabled: boolean;
  trustProxyHops: number;
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGIN: Joi.string().default('*'),
  SWAGGER_ENABLED: Joi.boolean().default(true),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_DB: Joi.number().integer().min(0).default(0),
  REDIS_KEY_PREFIX: Joi.string().default('medium-clone:'),
  AUTH_RATE_LIMIT: Joi.number()
    .integer()
    .positive()
    .default(DEFAULT_AUTH_RATE_LIMIT),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_DATABASE: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().min(JWT_SECRET_MIN_LENGTH).required(),
  JWT_EXPIRES_IN: Joi.number()
    .integer()
    .positive()
    .default(DEFAULT_JWT_EXPIRES_IN_SECONDS),
});

export default (): { app: AppConfig } => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    swaggerEnabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  },
});
