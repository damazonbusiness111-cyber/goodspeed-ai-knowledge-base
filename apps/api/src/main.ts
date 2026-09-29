import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '300kb' }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
