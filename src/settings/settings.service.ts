import { Injectable } from '@nestjs/common';
import { Settings } from '../entities/settings.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class SettingsService {
    constructor(@InjectRepository(Settings) private settingsRepository: Repository<Settings>, @InjectRepository(User) private userRepository: Repository<User>) { }

    async getSettings(userId: string): Promise<Settings> {
        const user = await this.userRepository.findOne({ relations: ["settings"], where: { id: userId } });
        return user.settings;
    }
}
