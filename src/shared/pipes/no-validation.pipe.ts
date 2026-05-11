import { ValidationPipe } from '@nestjs/common';

export const NoValidationPipe = new ValidationPipe({
  whitelist: false,
  transform: false,
  forbidNonWhitelisted: false,
});
