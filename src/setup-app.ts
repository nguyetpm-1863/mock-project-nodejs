import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Application } from 'express';
import helmet from 'helmet';
import { apiErrors } from './common/errors/api-errors.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { formatValidationErrors } from './common/validation/format-validation-errors.js';
import type { AppConfig } from './config/configuration.js';

export function setupApp(app: INestApplication): AppConfig {
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  if (config.trustProxyHops > 0) {
    const server: Application = app.getHttpAdapter().getInstance();
    server.set('trust proxy', config.trustProxyHops);
  }
  app.use(helmet());
  app.enableCors({ origin: config.corsOrigin });
  app.setGlobalPrefix(config.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException(
          apiErrors(formatValidationErrors(errors)),
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Medium Clone API')
        .setVersion('1.0')
        .addApiKey(
          { type: 'apiKey', in: 'header', name: 'Authorization' },
          'Token',
        )
        .build(),
    );
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document);
  }

  return config;
}
