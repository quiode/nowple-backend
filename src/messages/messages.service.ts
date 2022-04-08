import { Injectable, BadRequestException, NotFoundException, ForbiddenException, MessageEvent } from '@nestjs/common';
import { Message } from '../entities/message.entity';
import { MessageSendDto } from './messages.controller';
import { In, MoreThan, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { topics } from './topics';
import { Observable, Subject } from 'rxjs';
import { MessageEntitySubscriberService } from './message.entity.subscriber.service';
import { MessageChatEvent } from './messages.controller';

export interface MessageStreamCache {
    receiver: string;
    sender: string;
    messages: Message[];
    initialAmount: number;
    subject: Subject<MessageChatEvent>;
}

@Injectable()
export class MessagesService {
    messageStreamCache: MessageStreamCache[] = [];
    constructor(@InjectRepository(User) private userRepository: Repository<User>, @InjectRepository(Message) private messageRepository: Repository<Message>, private messageEntitySubscriberService: MessageEntitySubscriberService) {
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
        if (!(await this.userSenderFriendly(senderID, receiverID))) {
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

        const messages = await this.messageRepository.find({ where: { receiver: { id: In([receiverID, senderID]) }, sender: { id: In([receiverID, senderID]) } }, relations: ['sender', 'receiver'], order: { time: 'ASC' }, skip: start, take: end });
        return messages;
    }

    async generateNewTopic(senderID: string, receiverID: string): Promise<Message> {
        if (!(await this.userSenderFriendly(senderID, receiverID))) {
            throw new BadRequestException('User and sender are not in each others contacts or blocked or declined');
        }
        const sender = await this.userRepository.findOne({ id: senderID }, { relations: ['sentMessages', 'contacts', 'blocksOrDeclined'] });
        const receiver = await this.userRepository.findOne({ id: receiverID }, { relations: ['receivedMessages', 'contacts', 'blocksOrDeclined'] });

        // generate topic
        const topic = new Message();
        topic.sender = sender;
        topic.receiver = receiver;
        topic.message = topics[Math.floor(Math.random() * topics.length)].topic;
        topic.time = new Date();
        topic.isTopic = true;

        // save topic
        const message = await this.messageRepository.save(topic);
        return message;
    }

    getAmountStream(senderID: string, receiverID: string, amount: number): Observable<MessageChatEvent> {
        const cache: MessageStreamCache = {
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

        return cache.subject.asObservable();
    }

    /**
     * checks if the user and sender exist, are in each others contacts and not blocked or declined
     */
    async userSenderFriendly(senderID: string, receiverID: string): Promise<boolean> {
        // error if sender or receiver not found
        if (!this.userRepository.findOne({ id: senderID })) throw new NotFoundException('Sender not found');
        if (!this.userRepository.findOne({ id: receiverID })) throw new NotFoundException('Receiver not found');

        const sender = await this.userRepository.findOne({ id: senderID }, { relations: ['contacts', 'blocksOrDeclined'] });
        if (!sender) throw new NotFoundException('Sender not found');
        const receiver = await this.userRepository.findOne({ id: receiverID }, { relations: ['contacts', 'blocksOrDeclined'] });
        if (!receiver) throw new NotFoundException('Receiver not found');

        // check if user and receiver are in each others contacts and not blocked or declined
        if (sender.blocksOrDeclined.find(blockOrDecline => blockOrDecline.id === receiverID)) throw new BadRequestException('You have blocked this user!');
        if (receiver.blocksOrDeclined.find(blockOrDecline => blockOrDecline.id === senderID)) throw new ForbiddenException('This user has blocked you!');
        if (!sender.contacts.find(contact => contact.id === receiverID)) throw new BadRequestException('This user is not in your contacts!');
        if (!receiver.contacts.find(contact => contact.id === senderID)) throw new BadRequestException('You are not in this user\'s contacts!');

        return true;
    }

    async checkForNewMessages(cachedMessages: MessageStreamCache): Promise<Message[]> {
        if (!await this.userSenderFriendly(cachedMessages.sender, cachedMessages.receiver)) {
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
    findChat(senderID: string, receiverID: string, cache: MessageStreamCache[]): number {
        return cache.findIndex(cache => cache.sender === senderID && cache.receiver === receiverID);
    }

    /**
     * remove the chat from the cache
     */
    removeChat(senderID: string, receiverID: string): void {
        const index = this.findChat(senderID, receiverID, this.messageStreamCache);
        if (index !== -1) {
            this.messageStreamCache.splice(index, 1);
        }
    }
}
