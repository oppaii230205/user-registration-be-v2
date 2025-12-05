import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser()); // <-- REQUIRED for refresh token extraction

  app.useGlobalPipes(new ValidationPipe());
  // app.enableCors({ origin: "*", credentials: true });
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get("FRONTEND_URL"), // or your frontend URL
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await app.listen(3000);
}
void bootstrap();
