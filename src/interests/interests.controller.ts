import { Controller, UseGuards, Get, Req, InternalServerErrorException, Body, Patch } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../entities/user.entity';
import { InterestsBody } from '../auth/auth.controller';
import { Interests } from '../entities/interests.entity';

@Controller('interests')
export class InterestsController {
    constructor(private interestsService: InterestsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async getInterests(@Req() req: Request): Promise<Interests> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }

        return this.interestsService.getInterests((req.user as User).id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async updateInterests(@Body() body: InterestsBody, @Req() req: Request): Promise<Interests> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }

        return this.interestsService.updateInterests((req.user as User).id, body);
    }
}
