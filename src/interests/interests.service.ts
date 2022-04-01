import { Injectable } from '@nestjs/common';
import { Interests } from '../entities/interests.entity';
import { InterestsBody } from '../auth/auth.controller';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class InterestsService {
    constructor(@InjectRepository(User) private userRepository: Repository<User>, @InjectRepository(Interests) private interestsRepository: Repository<Interests>) { }

    /**
     * get Interests
     */
    async getInterests(userId: string): Promise<Interests> {
        const user = await this.userRepository.findOne({ id: userId }, { relations: ['interests'] });
        return user.interests;
    }

    /**
     * update Interests
     */
    async updateInterests(userId: string, body: InterestsBody): Promise<Interests> {
        const user = await this.userRepository.findOne({ id: userId }, { relations: ['interests'] });

        const interests: Interests = user.interests;
        interests.authoritarian = body.authoritarian ?? interests.authoritarian;
        interests.libertarian = body.libertarian ?? interests.libertarian;
        interests.economicLeft = body.economicLeft ?? interests.economicLeft;
        interests.economicRight = body.economicRight ?? interests.economicRight;

        return this.interestsRepository.save(interests);
    }
}
