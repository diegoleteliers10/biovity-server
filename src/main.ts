import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './shared/interceptors';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

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

  // Configure global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Biovity API')
    .setDescription('API para plataforma de empleos en biotecnología')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('jobs', 'Operaciones de ofertas de trabajo')
    .addTag('users', 'Operaciones de usuarios')
    .addTag('organizations', 'Operaciones de organizaciones')
    .addTag('applications', 'Operaciones de postulaciones')
    .addTag('saved-jobs', 'Operaciones de empleos guardados')
    .addTag('chat', 'Operaciones de chats')
    .addTag('message', 'Operaciones de mensajes')
    .addTag('resume', 'Operaciones de currículums')
    .addTag('health', 'Verificación de estado de la API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch(error => {
  console.error('Error starting the application:', error);
  process.exit(1);
});
