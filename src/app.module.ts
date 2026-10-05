import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  TOO_MANY_REQUESTS_MESSAGE,
} from './common/constants/app.constants.js';
import authConfig from './config/auth.config.js';
import configuration, { envValidationSchema } from './config/configuration.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : '.env',
      load: [configuration, databaseConfig, authConfig, redisConfig],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { ttl: DEFAULT_RATE_LIMIT_WINDOW_MS, limit: DEFAULT_RATE_LIMIT },
      ],
      errorMessage: TOO_MANY_REQUESTS_MESSAGE,
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
