import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './setup-app.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = setupApp(app);
  app.enableShutdownHooks();

  await app.listen(config.port);
  const url = await app.getUrl();
  Logger.log(`Server running at ${url}/${config.apiPrefix}`, 'Bootstrap');
  if (config.swaggerEnabled) {
    Logger.log(`Swagger docs at ${url}/${config.apiPrefix}/docs`, 'Bootstrap');
  }
}
await bootstrap();
