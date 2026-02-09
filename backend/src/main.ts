import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in the DTO
      forbidNonWhitelisted: true, // Throw if unknown properties are sent
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
