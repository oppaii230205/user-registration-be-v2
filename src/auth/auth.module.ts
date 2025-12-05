import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { AccessJwtStrategy } from "./strategies/access-jwt.strategy";

@Module({
  imports: [
    JwtModule.register({}), // dynamic secrets in strategy
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessJwtStrategy],
})
export class AuthModule {}
