import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class SharedService {
    private readonly saltRounds = 10;

    /**
     * creates a hash for a password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    /**
     * creates a hash for a password
     */
    hashPasswordSync(password: string): string {
        return bcrypt.hashSync(password, this.saltRounds);
    }

    
}
