import { Controller, Post, Body, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginRequest } from "./dto/login-request";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";

@Controller("auth")
export class AuthController {
  constructor(
    private config: ConfigService,
    private auth: AuthService,
  ) {}

  @Post("login")
  async login(
    @Body() dto: LoginRequest,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.auth.login(dto, req.ip || "");

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/auth/refresh",
    });

    return res.json({ accessToken: result.accessToken });
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken = (req?.cookies?.refreshToken ??
      req?.body?.refreshToken ??
      "") as string;

    const result = await this.auth.refresh(refreshToken, req.ip || "");

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: this.config.get("NODE_ENV") === "production",
      sameSite: "lax",
      path: "/auth/refresh",
    });

    return res.json({ accessToken: result.accessToken });
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res() res: Response) {
    const refreshToken = (req.cookies.refreshToken ?? "") as string;
    if (refreshToken) await this.auth.logout(refreshToken);

    res.clearCookie("refreshToken", { path: "/auth/refresh" });
    return res.json({ message: "Logged out" });
  }
}
