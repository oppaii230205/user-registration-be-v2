import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserRequest } from "./dto/create-user-request";
import * as bcrypt from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { CreateUserResponse } from "./dto/create-user-response";

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async register(dto: CreateUserRequest) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) throw new BadRequestException("Email already registered.");

    const salt = Number(this.config.get("BCRYPT_SALT"));
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashedPassword },
    });

    return <CreateUserResponse>{
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
