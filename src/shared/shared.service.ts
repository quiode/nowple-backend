import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { topics } from 'src/messages/topics';
import { Message } from '../entities/message.entity';
import { ideologies, Ideology } from './ideologies';
@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Message) private messageRepository: Repository<Message>
  ) {}

  private readonly saltRounds = 10;

  /**
   * creates a hash for a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * creates a hash for a password
   */
  hashPasswordSync(password: string): string {
    return bcrypt.hashSync(password, this.saltRounds);
  }

  async generateNewTopic(senderID: string, receiverID: string): Promise<Message> {
    if (!(await this.userSenderFriendly(senderID, receiverID))) {
      throw new BadRequestException(
        'User and sender are not in each others contacts or blocked or declined'
      );
    }
    const sender = await this.userRepository.findOne(
      { id: senderID },
      { relations: ['sentMessages', 'contacts', 'blocksOrDeclined'] }
    );
    const receiver = await this.userRepository.findOne(
      { id: receiverID },
      { relations: ['receivedMessages', 'contacts', 'blocksOrDeclined'] }
    );

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

  /**
   * checks if the user and sender exist, are in each others contacts and not blocked or declined
   */
  async userSenderFriendly(senderID: string, receiverID: string): Promise<boolean> {
    // error if sender or receiver not found
    if (!this.userRepository.findOne({ id: senderID }))
      throw new NotFoundException('Sender not found');
    if (!this.userRepository.findOne({ id: receiverID }))
      throw new NotFoundException('Receiver not found');

    const sender = await this.userRepository.findOne(
      { id: senderID },
      { relations: ['contacts', 'blocksOrDeclined'] }
    );
    if (!sender) throw new NotFoundException('Sender not found');
    const receiver = await this.userRepository.findOne(
      { id: receiverID },
      { relations: ['contacts', 'blocksOrDeclined'] }
    );
    if (!receiver) throw new NotFoundException('Receiver not found');

    // check if user and receiver are in each others contacts and not blocked or declined
    if (sender.blocksOrDeclined.find((blockOrDecline) => blockOrDecline.id === receiverID))
      throw new BadRequestException('You have blocked this user!');
    if (receiver.blocksOrDeclined.find((blockOrDecline) => blockOrDecline.id === senderID))
      throw new ForbiddenException('This user has blocked you!');
    if (!sender.contacts.find((contact) => contact.id === receiverID))
      throw new BadRequestException('This user is not in your contacts!');
    if (!receiver.contacts.find((contact) => contact.id === senderID))
      throw new BadRequestException("You are not in this user's contacts!");

    return true;
  }

  /**
   * finds a ideology based on input values
   */
  generateIdeology(civil: number, diplomatic: number, economic: number, society: number): Ideology {
    // find ideology that matches the input values closest
    let ideology: Ideology;
    let minDifference = Number.MAX_SAFE_INTEGER;
    for (const i of ideologies) {
      const difference =
        Math.abs(i.stats.govt - civil) +
        Math.abs(i.stats.dipl - diplomatic) +
        Math.abs(i.stats.econ - economic) +
        Math.abs(i.stats.scty - society);
      if (difference < minDifference) {
        minDifference = difference;
        ideology = i.name as Ideology;
      }
    }
    return ideology;
  }
}
