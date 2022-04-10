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
    key: fs.readFileSync('./test.key'),
    cert: fs.readFileSync('./test.crt'),
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

  await app.init();
  await server.listen(3000);
}
bootstrap();
