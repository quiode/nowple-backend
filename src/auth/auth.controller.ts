import { Controller, InternalServerErrorException, Post, Request, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
   constructor(private readonly authService: AuthService) {}

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
}
