import { Controller, Post, UseGuards, Req, InternalServerErrorException, Param, Body, Get } from '@nestjs/common';
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

    /**
     * sends a message to a user
     */
    @UseGuards(JwtAuthGuard)
    @Post('send/:id')
    async send(@Param('id') id: string, @Req() req: Request, @Body() body: MessageSendDto): Promise<Message> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        return this.messagesService.sendMessage((req.user as User).id, id, body);
    }

    /**
     * gets the first 100 messages from the conversation with the user with the given id
     */
    @UseGuards(JwtAuthGuard)
    @Get('conversation/:id')
    async getConversation(@Param('id') id: string, @Req() req: Request): Promise<Message[]> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        return this.messagesService.getRange((req.user as User).id, id, 0, 100);
    }

    /**
     * gets a specific range of messages from the conversation with the user with the given id
     */
    @UseGuards(JwtAuthGuard)
    @Get('conversation/:id/:start/:end')
    async getConversationRange(@Param('id') id: string, @Param('start') start: number, @Param('end') end: number, @Req() req: Request): Promise<Message[]> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        return this.messagesService.getRange((req.user as User).id, id, start, end);
    }
}
