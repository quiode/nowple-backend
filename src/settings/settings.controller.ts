import { Controller, Get, UseGuards, Request, InternalServerErrorException } from '@nestjs/common';
import { Settings } from 'src/entities/settings.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { User } from '../entities/user.entity';

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
}
