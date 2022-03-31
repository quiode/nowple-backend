import { Injectable } from '@nestjs/common';
import { Interests } from '../entities/interests.entity';
import { InterestsBody } from '../auth/auth.controller';

@Injectable()
export class InterestsService {

    /**
     * get Interests
     */
    async getInterests(userId: string): Promise<Interests> {
        // TODO
        return null;
    }

    /**
     * update Interests
     */
    async updateInterests(userId: string, body: InterestsBody): Promise<Interests> {
        // TODO
        return null;
    }
}
