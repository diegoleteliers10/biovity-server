// api/index.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

export const createNestServer = async (expressInstance: express.Express) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.setGlobalPrefix('api/v1');
  app.enableCors();

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
