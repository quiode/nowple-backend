import { Controller, Get, UseGuards, Request, InternalServerErrorException, Patch, Body } from '@nestjs/common';
import { Settings } from 'src/entities/settings.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { User } from '../entities/user.entity';

export class updateSettingsDto {
  isDarkMode?: boolean;
}

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Request() req): Promise<Settings> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    return this.settingsService.getSettings((req.user as User).id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateSettings(@Request() req, @Body() updateSettingsBody: updateSettingsDto): Promise<Settings> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    return this.settingsService.updateSettings((req.user as User).id, updateSettingsBody);
  }
}
