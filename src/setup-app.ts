import {
  INestApplication,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import type { AppConfig } from './config/configuration.js';

const flattenErrors = (errors: ValidationError[]): string[] =>
  errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...flattenErrors(error.children ?? []),
  ]);

export function setupApp(app: INestApplication): AppConfig {
  const config = app.get(ConfigService).getOrThrow<AppConfig>('app');

  app.use(helmet());
  app.enableCors({ origin: config.corsOrigin });
  app.setGlobalPrefix(config.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException(flattenErrors(errors)),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Medium Clone API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document);
  }

  return config;
}
