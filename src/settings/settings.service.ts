import { Injectable, NotFoundException } from '@nestjs/common';
import { Settings } from '../entities/settings.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { SettingsBody } from '../auth/auth.controller';

@Injectable()
export class SettingsService {
    constructor(@InjectRepository(Settings) private settingsRepository: Repository<Settings>, @InjectRepository(User) private userRepository: Repository<User>) { }

    async getSettings(userId: string): Promise<Settings> {
        const user = await this.userRepository.findOne({ relations: ["settings"], where: { id: userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user.settings;
    }

    async updateSettings(userId: string, body: SettingsBody): Promise<Settings> {
        const user = await this.userRepository.findOne({ relations: ["settings"], where: { id: userId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const settings = user.settings;
        settings.isDarkMode = body.isDarkMode != null ? body.isDarkMode : settings.isDarkMode;

        await this.settingsRepository.save(settings);

        return settings;
    }
}
