import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { User } from '../entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { SharedService } from '../shared/shared.service';
import * as bcrypt from 'bcrypt';

interface jwtPayload {
    username: string;
    sub: string;
}
@Injectable()
export class AuthService {
    constructor(private userService: UserService, private jwtService: JwtService, private sharedService: SharedService) {
    }

    /**
     * validates the user credentials, returns the User only if the password matches with the stored hash
     */
    async validateUser(username: string, password: string): Promise<User | null> {
        const user = await this.userService.findOneByUsername(username);
        if (user == undefined) return null;
        if (!bcrypt.compareSync(password, user.password)) return null;
        return user;
    }

    /**
     * creates a valid JWT and returns it
     */
    async login(user: User): Promise<string> {
        const payload: jwtPayload = { username: user.username, sub: user.id };
        return this.jwtService.sign(payload);
    }

    async validateToken(token: string): Promise<User> {
        let payload: jwtPayload = { username: '', sub: '' };
        try {
            payload = this.jwtService.verify<jwtPayload>(token);
        } catch (e) {
            throw new ForbiddenException('Invalid token');
        }
        const user = await this.userService.findOneByUUID(payload.sub);
        if (user == undefined) throw new NotFoundException('User not found');
        return user;
    }
}
