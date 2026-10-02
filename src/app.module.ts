import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration, { envValidationSchema } from './config/configuration.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    HealthModule,
  ],
})
export class AppModule {}
