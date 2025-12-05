import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { UserService } from "./users.service";
import { CreateUserRequest } from "./dto/create-user-request";
import { AccessJwtGuard } from "src/auth/guards/access-jwt.guard";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AccessJwtGuard)
  @Get("me")
  getMe(@Req() req) {
    return this.userService.getById(req.user.userId);
  }

  @Post("register")
  async register(@Body() dto: CreateUserRequest) {
    return {
      status: "success",
      statusCode: 201,
      data: await this.userService.register(dto),
    };
  }
}
