import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser()); // <-- REQUIRED for refresh token extraction

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({ origin: "*", credentials: true });
  await app.listen(3000);
}
void bootstrap();
