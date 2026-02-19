import cookieParser from "cookie-parser";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "~/app.module";
import { GlobalExceptionFilter } from "~/common/filters/global-exception.filter";
import { LoggingInterceptor } from "~/common/interceptors/logging.interceptor";
import { TransformInterceptor } from "~/common/interceptors/transform.interceptor";
import { AppValidationPipe } from "~/common/pipes/validation.pipe";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://i.ytimg.com"],
          connectSrc: [
            "'self'",
            "https://oauth2.googleapis.com",
            "https://accounts.google.com",
            "https://www.googleapis.com",
            "https://youtubeanalytics.googleapis.com",
            "https://analyticsdata.googleapis.com"
          ]
        }
      },
      referrerPolicy: {
        policy: "no-referrer"
      },
      xssFilter: true
    })
  );
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>("app.frontendUrl"),
    credentials: true
  });

  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = configService.get<number>("app.port") ?? 3001;
  await app.listen(port);
}

bootstrap();
