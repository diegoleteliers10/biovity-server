import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Configure cookie parser
  app.use(cookieParser());

  // Set global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Configure global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    }),
  );

  await app.listen(3001);
}

bootstrap().catch(error => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
