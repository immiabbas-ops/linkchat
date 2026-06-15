import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const isDev = config.get<string>('NODE_ENV') !== 'production';
  const allowedOrigins = corsOrigin.split(',').map((o) => o.trim());

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: isDev
      ? (origin, callback) => {
          if (
            !origin ||
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            allowedOrigins.includes(origin)
          ) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        }
      : allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Link-Chat API')
    .setDescription('Real-time communication + services super app')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(port);
  console.log(`Link-Chat API running on http://localhost:${port}/${prefix}`);
}

bootstrap();
