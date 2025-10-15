import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './infrastructure/framework/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Registrar filtro global
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
