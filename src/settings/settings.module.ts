import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from '../entities/settings.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings,User])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [],
})
export class SettingsModule {}
