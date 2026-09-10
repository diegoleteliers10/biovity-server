// api/index.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { corsOptions } from '../src/infrastructure/config/cors.config';

const server = express();

// Trust the reverse proxy hop (Vercel) so req.ip resolves to the client IP
server.set('trust proxy', 1);
server.use(cookieParser());

export const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors(corsOptions);

  await app.init();
  return app;
};

let cachedApp: any;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    await createNestServer(server);
    cachedApp = server;
  }
  server(req, res);
}
