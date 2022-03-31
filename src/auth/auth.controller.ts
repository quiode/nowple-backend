import { Controller, InternalServerErrorException, Post, Request, UseGuards, Body } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserService } from '../user/user.service';
import { IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, IsString } from 'class-validator';

export class InterestsBody {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  authoritarian?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  economicRight?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  economicLeft?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  libertarian?: number;
}

export class SettingsBody {
  @IsOptional()
  @IsBoolean()
  isDarkMode?: boolean;
}

export class RegisterBody {
  @IsNotEmpty()
  @IsString()
  username: string;
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsObject()
  settings?: SettingsBody;

  @IsOptional()
  @IsObject()
  interests?: InterestsBody;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private userService: UserService) { }

  /**
   * requires password and username in body, returns a JWT
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req): Promise<string> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    return this.authService.login(req.user as User);
  }

  /**
   * requires a still valid JWT in the header, returns a new JWT
   */
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Request() req): Promise<string> {
    return this.authService.login(req.user as User);
  }

  /**
   * registers a new user and returns a JWT
   */
  @Post('register')
  async register(@Body() body: RegisterBody): Promise<string> {
    const user = await this.userService.create(body);
    return this.authService.login(user);
  }
}
