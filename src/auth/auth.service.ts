import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private userService: UserService, private jwtService: JwtService) {
    }
    readonly saltRounds = 10;

    /**
     * validates the user credentials, returns the User only if the password matches with the stored hash
     */
    async validateUser(username: string, password: string): Promise<User | null> {
        const user = await this.userService.findOneByUsername(username);
        if (!user) null;
        const hashedPassword = bcrypt.hashSync(password, this.saltRounds);
        if (user.password != hashedPassword) null;
        return user;
    }

    /**
     * creates a valid JWT and returns it
     */
    async login(user: User): Promise<string> {
        const payload = { username: user.username, sub: user.id };
        return this.jwtService.sign(payload);
    }
}
