import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Atrás de proxy, o req.ip só é o do visitante se a API confiar nos saltos
  // até ele; sem isso, o limite da inscrição valeria para todos juntos.
  app.set('trust proxy', Number(process.env.SALTOS_DE_PROXY ?? 0));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });

  // A documentação da API (/docs) fica só fora de produção.
  if (process.env.NODE_ENV !== 'production') {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Clínica Escola FBr — API')
        .setVersion('0.1.0')
        .build(),
    );
    SwaggerModule.setup('docs', app, documento);
  }

  await app.listen(process.env.API_PORT ?? 3333);
}
void bootstrap();
