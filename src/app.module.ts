import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { envValidationSchema } from './config/configuration.js';
import databaseConfig from './config/database.config.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, databaseConfig],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
