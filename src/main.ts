import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Server, ServerOptions } from 'spdy';
import { AppModule } from './app.module';
import { Express } from 'express';
import * as fs from 'fs';
import * as spdy from 'spdy';
import * as express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const expressApp: Express = express();

  const spdyOpts: ServerOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./chain.pem'),
    spdy: {
      protocols: ['h2', 'http/1.1', 'http/1.0'],
    },
  };

  const server: Server = spdy.createServer(spdyOpts, expressApp);

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    cors: {
      origin: '*',
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  app.setGlobalPrefix('api');

  await app.init();
  await server.listen(3001);
}
bootstrap();
