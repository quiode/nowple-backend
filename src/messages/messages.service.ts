import { Injectable, BadRequestException } from '@nestjs/common';
import { Message } from '../entities/message.entity';
import { MessageSendDto } from './messages.controller';
import { In, MoreThan, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Subject, interval } from 'rxjs';
import { MessageEntitySubscriberService } from './message.entity.subscriber.service';
import { MessageChatEvent } from './messages.controller';
import { randomUUID } from 'crypto';
import { SharedService } from '../shared/shared.service';

export interface MessageStreamCache {
    id: string;
    receiver: string;
    sender: string;
    messages: Message[];
    initialAmount: number;
    subject: Subject<MessageChatEvent>;
}

@Injectable()
export class MessagesService {
    messageStreamCache: MessageStreamCache[] = [];
    constructor(@InjectRepository(User) private userRepository: Repository<User>, @InjectRepository(Message) private messageRepository: Repository<Message>, private messageEntitySubscriberService: MessageEntitySubscriberService, private sharedService: SharedService) {
        // to not auto-disconnect
        interval(10000).subscribe(() => {
            this.messageStreamCache.forEach(cache => {
                cache.subject.next({
                    data: [],
                })
            });
        });

        this.messageEntitySubscriberService.getMessageChangeEvent().subscribe(async (event) => {
            this.messageStreamCache.forEach(async (cache) => {
                const newMessages = await this.checkForNewMessages(cache);
                if (newMessages.length > 0) {
                    cache.messages.push(...newMessages);
                    cache.subject.next({
                        data: newMessages,
                    });
                }
            });
        });
    }

    async sendMessage(receiverID: string, senderID: string, message: MessageSendDto): Promise<Message> {
        if (!(await this.sharedService.userSenderFriendly(senderID, receiverID))) {
            throw new BadRequestException('User and sender are not in each others contacts or blocked or declined');
        }
        const sender = await this.userRepository.findOne({ id: senderID }, { relations: ['sentMessages', 'contacts', 'blocksOrDeclined'] });
        const receiver = await this.userRepository.findOne({ id: receiverID }, { relations: ['receivedMessages', 'contacts', 'blocksOrDeclined'] });

        // creates message
        const newMessage = new Message();
        newMessage.sender = sender;
        newMessage.receiver = receiver;
        newMessage.message = message.message;
        newMessage.time = new Date(message.date);

        const sentMessage = await this.messageRepository.save(newMessage);
        return sentMessage;
    }

    async getRange(senderID: string, receiverID: string, start: number, end: number): Promise<Message[]> {
        // error if sender or receiver not found
        if (!this.userRepository.findOne({ id: senderID })) throw new BadRequestException('Sender not found');
        if (!this.userRepository.findOne({ id: receiverID })) throw new BadRequestException('Receiver not found');

        const messages = await this.messageRepository.find({ where: { receiver: { id: In([receiverID, senderID]) }, sender: { id: In([receiverID, senderID]) } }, relations: ['sender', 'receiver'], order: { time: 'DESC' }, skip: start, take: end });
        return messages;
    }

    getAmountStream(senderID: string, receiverID: string, amount: number): MessageStreamCache {
        const cache: MessageStreamCache = {
            id: randomUUID(),
            receiver: receiverID,
            sender: senderID,
            messages: [],
            initialAmount: amount,
            subject: new Subject<MessageChatEvent>(),
        }

        this.messageStreamCache.push(cache);

        this.getRange(senderID, receiverID, 0, amount).then(async (messages) => {
            cache.messages = messages;
            cache.subject.next({
                data: messages,
            });
        });

        return cache;
    }

    async checkForNewMessages(cachedMessages: MessageStreamCache): Promise<Message[]> {
        if (!await this.sharedService.userSenderFriendly(cachedMessages.sender, cachedMessages.receiver)) {
            return [];
        }

        const newMessages = await this.messageRepository.find({
            where: {
                id: MoreThan(cachedMessages.messages.sort((a, b) => a.id - b.id)[cachedMessages.messages.length - 1].id),
                receiver: { id: In([cachedMessages.receiver, cachedMessages.sender]) },
                sender: { id: In([cachedMessages.receiver, cachedMessages.sender]) },
            },
            relations: ['sender', 'receiver'],
            order: { time: 'ASC' }
        });

        return newMessages;
    }

    /**
     * Returns the index of the first element in the array, and -1 otherwise
     */
    findChat(uuid: string, cache: MessageStreamCache[]): number {
        return cache.findIndex(cache => cache.id === uuid);
    }

    /**
     * remove the chat from the cache
     */
    removeChat(uuid: string): void {
        const index = this.findChat(uuid, this.messageStreamCache);
        if (index !== -1) {
            this.messageStreamCache.splice(index, 1);
        }
    }
}
