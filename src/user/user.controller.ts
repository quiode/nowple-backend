import { Controller, Get, Req, UseGuards, InternalServerErrorException, Param, BadRequestException, Patch, Body } from '@nestjs/common';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { IsOptional, IsString } from 'class-validator';

export class UserDto {
    @IsOptional()
    @IsString()
    username?: string;
    @IsOptional()
    @IsString()
    password?: string;
}
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getProfile(@Req() req: Request) {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        const user = await this.userService.getFullUser(req.user as User);
        const { password, ...returnVal } = user;
        return returnVal;
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async getUser(@Req() req: Request, @Param('id') id: string) {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        const publicProfile = await this.userService.getPublicProfile(id);
        if (!publicProfile) {
            throw new BadRequestException('User not found');
        }
        const { password, ...strippedProfile } = publicProfile;
        return strippedProfile;
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async updateUser(@Body() body: UserDto, @Req() req: Request) {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        const user = await this.userService.updateUser(req.user as User, req.body);
        const { password, ...returnVal } = user;
        return returnVal;
    }
}
