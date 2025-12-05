import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { LoginRequest } from "./dto/login-request";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private generateRefreshToken() {
    return randomBytes(64).toString("hex"); // 128 chars, high entropy
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    return user;
  }

  async login(dto: LoginRequest, ip: string) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException("Invalid credentials");

    return this.issueTokens(user.id, ip);
  }

  async issueTokens(userId: string, ip: string) {
    const payload = { sub: userId };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get("JWT_ACCESS_EXPIRES"),
      secret: this.config.get("JWT_ACCESS_SECRET"),
    });

    // Create + store refresh token
    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(
      Date.now() + this.config.get<number>("REFRESH_TOKEN_DAYS")! * 86400000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        createdByIp: ip,
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(oldToken: string, ip: string) {
    if (!oldToken) throw new UnauthorizedException("Refresh token is required");

    const oldHash = this.hashToken(oldToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: oldHash },
      include: { user: true },
    });

    if (!tokenRecord)
      throw new UnauthorizedException("Refresh token not found");

    if (tokenRecord.revoked)
      throw new UnauthorizedException("Refresh token revoked");

    if (tokenRecord.expiresAt < new Date())
      throw new UnauthorizedException("Refresh token expired");

    // ROTATION: create new refresh token
    const newToken = this.generateRefreshToken();
    const newHash = this.hashToken(newToken);
    const newExpires = new Date(
      Date.now() + this.config.get<number>("REFRESH_TOKEN_DAYS")! * 86400000,
    );

    const created = await this.prisma.refreshToken.create({
      data: {
        userId: tokenRecord.userId,
        tokenHash: newHash,
        expiresAt: newExpires,
        createdByIp: ip,
      },
    });

    // revoke old and link them
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revoked: true,
        replacedById: created.id,
        lastUsedAt: new Date(),
        lastUsedByIp: ip,
      },
    });

    // new access token
    const accessToken = this.jwt.sign(
      { sub: tokenRecord.userId },
      {
        expiresIn: this.config.get("JWT_ACCESS_EXPIRES"),
        secret: this.config.get("JWT_ACCESS_SECRET"),
      },
    );

    return { accessToken, refreshToken: newToken };
  }

  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revoked: false },
      data: { revoked: true },
    });
  }
}
