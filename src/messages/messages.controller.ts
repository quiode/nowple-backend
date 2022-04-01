import { Controller, Post, UseGuards, Req, InternalServerErrorException, Param, Body } from '@nestjs/common';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { Message } from 'src/entities/message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { MessagesService } from './messages.service';

export class MessageSendDto {
    @IsNotEmpty()
    @IsString()
    message: string

    @IsNotEmpty()
    @IsDate()
    date: Date
}

@Controller('messages')
export class MessagesController {
    constructor(private messagesService: MessagesService) { }

    @UseGuards(JwtAuthGuard)
    @Post('send/:id')
    async send(@Param('id') id: string, @Req() req: Request, @Body() body: MessageSendDto): Promise<Message> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        return this.messagesService.sendMessage((req.user as User).id, id, body);
    }
}
