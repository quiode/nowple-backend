import { Injectable, BadRequestException } from '@nestjs/common';
import { Message } from '../entities/message.entity';
import { MessageSendDto } from './messages.controller';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MessagesService {
    constructor(@InjectRepository(User) private userRepository: Repository<User>, @InjectRepository(Message) private messageRepository: Repository<Message>) { }

    async sendMessage(receiverID: string, senderID: string, message: MessageSendDto): Promise<Message> {
        const sender = await this.userRepository.findOne({ id: senderID }, { relations: ['sentMessages', 'contacts', 'blocksOrDeclined'] });
        if (!sender) throw new BadRequestException('Sender not found');

        const receiver = await this.userRepository.findOne({ id: receiverID }, { relations: ['receivedMessages', 'contacts', 'blocksOrDeclined'] });
        if (!receiver) throw new BadRequestException('Receiver not found');

        // check if message can be sent
        if (sender.blocksOrDeclined.find(blockOrDecline => blockOrDecline.id === receiverID)) throw new BadRequestException('You have blocked this user!');
        if (receiver.blocksOrDeclined.find(blockOrDecline => blockOrDecline.id === senderID)) throw new BadRequestException('This user has blocked you!');
        if (!sender.contacts.find(contact => contact.id === receiverID)) throw new BadRequestException('This user is not in your contacts!');
        if (!receiver.contacts.find(contact => contact.id === senderID)) throw new BadRequestException('You are not in this user\'s contacts!');

        // creates message
        const newMessage = new Message();
        newMessage.sender = sender;
        newMessage.receiver = receiver;
        newMessage.message = message.message;
        newMessage.time = message.date;

        const sentMessage = await this.messageRepository.save(newMessage);

        // adds message to sender's messages
        sender.sentMessages.push(sentMessage);
        this.userRepository.save(sender);

        // adds message to receiver's messages
        receiver.receivedMessages.push(sentMessage);
        this.userRepository.save(receiver);

        return sentMessage;
    }
}
