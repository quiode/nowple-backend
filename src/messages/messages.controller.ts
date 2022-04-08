import { Controller, Post, UseGuards, Req, InternalServerErrorException, Param, Body, Get, ParseUUIDPipe, Sse, MessageEvent, ParseIntPipe } from '@nestjs/common';
import { IsDate, IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Message } from 'src/entities/message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { MessagesService } from './messages.service';

export class MessageSendDto {
    @IsNotEmpty()
    @IsString()
    message: string

    @IsNotEmpty()
    @IsDateString()
    date: string;
}

@Controller('messages')
export class MessagesController {
    constructor(private messagesService: MessagesService) { }

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
    @UseGuards(JwtAuthGuard)
    @Sse('conversation/stream/:id')
    getConversationStream(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Observable<MessageEvent> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        req.on('close', () => {
            this.messagesService.removeChat((req.user as User).id, id);
        });
        return this.messagesService.getAmountStream((req.user as User).id, id, 100);
    }

    /**
 * gets the conversation with the user with the given id, returns the last 100 messages but as a server side event
 */
    @UseGuards(JwtAuthGuard)
    @Sse('conversation/stream/:id/:amount')
    getConversationStreamAmount(@Param('id', ParseUUIDPipe) id: string, @Param('amount', ParseIntPipe) amount: number, @Req() req: Request): Observable<MessageEvent> {
        if (!(req.user as User)) {
            throw new InternalServerErrorException('User not found');
        }
        req.on('close', () => {
            this.messagesService.removeChat((req.user as User).id, id);
        });
        return this.messagesService.getAmountStream((req.user as User).id, id, amount);
    }
}
