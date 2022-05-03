import {
  Controller,
  Post,
  UseGuards,
  Req,
  InternalServerErrorException,
  Param,
  Body,
  Get,
  ParseUUIDPipe,
  Sse,
  MessageEvent,
  BadRequestException,
} from '@nestjs/common';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { Request } from 'express';
import { map } from 'rxjs';
import { Message } from 'src/entities/message.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';
import { MessagesService } from './messages.service';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/shared.service';

export class MessageSendDto {
  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}

export interface MessageChatEvent extends MessageEvent {
  data: Message[];
}

@Controller('messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private authService: AuthService,
    private sharedService: SharedService
  ) { }

  /**
   * sends a message to a user
   */
  @UseGuards(JwtAuthGuard)
  @Post('send/:id')
  async send(@Param('id') id: string, @Req() req: Request, @Body() body: MessageSendDto) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (await this.sharedService.isBlocked(id, (req.user as User).id)) {
      throw new BadRequestException('User is blocked');
    }

    const message: Message = await this.messagesService.sendMessage(
      (req.user as User).id,
      id,
      body
    );
    // strip topic of sensitive data
    const { receiver, sender, ...strippedMessage } = message;
    return strippedMessage;
  }

  /**
   * generates a new topic for a specific chat
   */
  @UseGuards(JwtAuthGuard)
  @Get('topic/:id')
  async generateNewTopic(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (await this.sharedService.isBlocked(id, (req.user as User).id)) {
      throw new BadRequestException('User is blocked');
    }

    const topic: Message = await this.sharedService.generateNewTopic((req.user as User).id, id);
    // strip topic of sensitive data
    const { receiver, sender, ...strippedTopic } = topic;
    return strippedTopic;
  }

  /**
   * gets the conversation with the user with the given id, returns the last 100 messages but as a server side event
   */
  @Sse('conversation/stream/:id/:token')
  async getConversationStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('token') token: string,
    @Req() req: Request
  ) {
    const user = await this.authService.validateToken(token);

    if (await this.sharedService.isBlocked(id, user.id)) {
      throw new BadRequestException('User is blocked');
    }

    const cache = this.messagesService.getAmountStream(user.id, id, 100);
    req.on('close', () => {
      this.messagesService.removeChat(cache.id);
    });
    return cache.subject.asObservable().pipe(
      map((event: MessageEvent) => {
        const modifiedData = (event.data as Message[]).map((message: Message) => {
          // remove everything form receiver and sender except uuid and username
          const { receiver, sender, ...strippedMessage } = message;
          return {
            ...strippedMessage,
            receiver: { username: receiver.username, id: receiver.id },
            sender: { username: sender.username, id: sender.id },
          };
        });
        return { ...event, data: modifiedData };
      })
    );
  }
}
