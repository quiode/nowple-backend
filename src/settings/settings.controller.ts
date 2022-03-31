import { Controller, Get, UseGuards, InternalServerErrorException, Patch, Body, Req, BadRequestException } from '@nestjs/common';
import { Settings } from 'src/entities/settings.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { User } from '../entities/user.entity';
import { Request } from 'express';
import { SettingsBody } from '../auth/auth.controller';
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Req() req: Request): Promise<Settings> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    return this.settingsService.getSettings((req.user as User).id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateSettings(@Body() body: SettingsBody, @Req() req: Request): Promise<Settings> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (req.body == null) throw new BadRequestException('Body is empty');

    return this.settingsService.updateSettings((req.user as User).id, req.body as SettingsBody);
  }
}
