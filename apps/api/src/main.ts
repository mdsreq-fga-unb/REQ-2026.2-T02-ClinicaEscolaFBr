import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_URL, credentials: true });

  const documento = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Clínica Escola FBr — API')
      .setVersion('0.1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, documento);

  await app.listen(process.env.API_PORT ?? 3333);
}
void bootstrap();
