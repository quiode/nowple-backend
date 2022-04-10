import { Controller, Post, UseGuards, Req, InternalServerErrorException, Param, Body, Get, ParseUUIDPipe, Sse, MessageEvent, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { IsDate, IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { interval, map, Observable } from 'rxjs';
import { Message } from 'src/entities/message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { MessagesService } from './messages.service';
import { AuthService } from '../auth/auth.service';

export class MessageSendDto {
    @IsNotEmpty()
    @IsString()
    message: string

    @IsNotEmpty()
    @IsDateString()
    date: string;
}

export interface MessageChatEvent extends MessageEvent {
    data: Message[];
}

@Controller('messages')
export class MessagesController {
    constructor(private messagesService: MessagesService, private authService: AuthService) { }

    /**
     * sends a message to a user
     */
    @UseGuards(JwtAuthGuard)
    @Post('send/:id')
    async send(@Param('id') id: string, @Req() req: Request, @Body() body: MessageSendDto) {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        const message: Message = await this.messagesService.sendMessage((req.user as User).id, id, body);
        // strip topic of sensitive data
        const { receiver, sender, ...strippedMessage } = message;
        return strippedMessage;
    }

    // /**
    //  * gets the first 100 messages from the conversation with the user with the given id
    //  */
    // @UseGuards(JwtAuthGuard)
    // @Get('conversation/static/:id')
    // async getConversation(@Param('id') id: string, @Req() req: Request): Promise<Message[]> {
    //     if (!(req.user as User)) {
    //         throw new InternalServerErrorException('User not found');
    //     }
    //     return this.messagesService.getRange((req.user as User).id, id, 0, 100);
    // }

    // /**
    //  * gets a specific range of messages from the conversation with the user with the given id
    //  */
    // @UseGuards(JwtAuthGuard)
    // @Get('conversation/static/:id/:start/:end')
    // async getConversationRange(@Param('id', ParseUUIDPipe) id: string, @Param('start') start: number, @Param('end') end: number, @Req() req: Request): Promise<Message[]> {
    //     if (!(req.user as User)) {
    //         throw new InternalServerErrorException('User not found');
    //     }
    //     return this.messagesService.getRange((req.user as User).id, id, start, end);
    // }

    /**
     * generates a new topic for a specific chat
     */
    @UseGuards(JwtAuthGuard)
    @Get('topic/:id')
    async generateNewTopic(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        const topic: Message = await this.messagesService.generateNewTopic((req.user as User).id, id);
        // strip topic of sensitive data
        const { receiver, sender, ...strippedTopic } = topic;
        return strippedTopic;
    }

    /**
     * gets the conversation with the user with the given id, returns the last 100 messages but as a server side event
     */
    @Sse('conversation/stream/:id/:token')
    async getConversationStream(@Param('id', ParseUUIDPipe) id: string, @Param('token') token: string, @Req() req: Request) {
        const user = await this.authService.validateToken(token);
        const cache = this.messagesService.getAmountStream(user.id, id, 100);
        req.on('close', () => {
            this.messagesService.removeChat(cache.id);
        });
        return cache.subject.asObservable().pipe(
            map((event: MessageEvent) => {
                const modifiedData = (event.data as Message[]).map((message: Message) => {
                    // remove everything form receiver and sender except uuid and username
                    const { receiver, sender, ...strippedMessage } = message;
                    return { ...strippedMessage, receiver: { username: receiver.username, id: receiver.id }, sender: { username: sender.username, id: sender.id } };
                });
                return { ...event, data: modifiedData };
            })
        );
    }

    // @Sse('test')
    // async test() {
    //     return interval(1000).pipe(map((_) =>
    //         ({ data: { hello: 'world' } })));
    // }
}
