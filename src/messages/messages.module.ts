import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { MessageEntitySubscriberService } from './message.entity.subscriber.service';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User]), AuthModule, SharedModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessageEntitySubscriberService],
  exports: [MessagesService],
})
export class MessagesModule { }
