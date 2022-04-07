import { ConflictException, Injectable, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interests } from 'src/entities/interests.entity';
import { Settings } from 'src/entities/settings.entity';
import { User } from 'src/entities/user.entity';
import { Any, In, Not, Raw, Repository } from 'typeorm';
import { RegisterBody } from '../auth/auth.controller';
import { SharedService } from '../shared/shared.service';
import { Message } from '../entities/message.entity';
import * as fs from 'fs';
import { extname } from 'path';

export interface Chat { user: User, lastMessage?: Message }

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>, private sharedService: SharedService, @InjectRepository(Message) private messageRepository: Repository<Message>) { }

  /**
   * Finds a user by its username, shorthand for {@link findOneByUsername}
   */
  async findOne(username: string): Promise<User | undefined> {
    return this.findOneByUsername(username);
  }

  /**
   * Finds a user by its username
   */
  async findOneByUsername(username: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ username });
  }

  /**
   * Finds a user by its uuid
   */
  async findOneByUUID(uuid: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ id: uuid });
  }

  /**
   * returns true is the username exists
   */
  async usernameExists(username: string): Promise<boolean> {
    return await this.userRepository.findOne({ username }) !== undefined;
  }

  /**
   * creates a new user
   */
  async create(user: RegisterBody): Promise<User> {
    if (await this.usernameExists(user.username)) throw new ConflictException('Username already exists');

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = this.sharedService.hashPasswordSync(user.password);
    newUser.matches = [];
    newUser.sentMessages = [];
    newUser.receivedMessages = [];

    newUser.settings = new Settings();
    newUser.settings.isDarkMode = user.settings?.isDarkMode ?? false;

    newUser.interests = new Interests();
    newUser.interests.civil = user.interests?.civil ?? null;
    newUser.interests.diplomatic = user.interests?.diplomatic ?? null;
    newUser.interests.economic = user.interests?.economic ?? null;
    newUser.interests.society = user.interests?.society ?? null;
    newUser.interests.ideology = user.interests?.ideology ?? null;

    return this.userRepository.save(newUser);
  }

  /**
   * returns a user with all properties (settings, messages, contacts usw.)
   */
  async getFullUser(user: User): Promise<User> {
    const userToReturn = await this.userRepository.findOne({ id: user.id }, { relations: ['settings', 'interests', 'sentMessages', 'receivedMessages', 'matches', "blocksOrDeclined", "contacts"] });
    return userToReturn;
  }

  /**
   * returns the public profile of a random user (stripped of sensitive information)
   */
  async getPublicProfile(userID: string): Promise<User> {
    const userToReturn = await this.userRepository.findOne({ id: userID }, { relations: ['interests'] });
    return userToReturn;
  }

  async updateUser(user: User, update: any): Promise<User> {
    const userToUpdate = await this.userRepository.findOne({ id: user.id });
    if (userToUpdate === undefined) throw new BadRequestException('User not found');

    userToUpdate.username = update.username ?? userToUpdate.username;
    const passwordToHash = update.password ?? userToUpdate.password;
    userToUpdate.password = this.sharedService.hashPasswordSync(passwordToHash);

    return this.userRepository.save(userToUpdate);
  }

  async blockUser(userID: string, blockedUserID: string): Promise<User> {
    const userToUpdate = await this.userRepository.findOne({ id: userID }, { relations: ['blocksOrDeclined', 'matches', 'contacts'] });
    if (userToUpdate === undefined) throw new BadRequestException('User not found');

    const blockedUser = await this.userRepository.findOne({ id: blockedUserID });
    if (blockedUser === undefined) throw new BadRequestException('User to block not found');

    // add to block/decline list
    userToUpdate.blocksOrDeclined = [...userToUpdate.blocksOrDeclined, blockedUser];

    // remove from matches
    userToUpdate.matches = userToUpdate.matches.filter(match => match.id !== blockedUser.id);
    // remove from contacts
    userToUpdate.contacts = userToUpdate.contacts.filter(contact => contact.id !== blockedUser.id);

    return this.userRepository.save(userToUpdate);
  }

  /**
   * finds a new match without considering preferences or interests, only excluding blocked users
   */
  async findNewContact(userID: string): Promise<User> {
    const user = await this.userRepository.findOne({ id: userID }, { relations: ['matches', 'contacts', 'blocksOrDeclined'] });
    if (user === undefined) throw new BadRequestException('User not found');

    const contacts = await this.userRepository.find({
      where: {
        id: Not(In([
          user.id,
          ...user.contacts.map(contact => contact.id),
          ...user.matches.map(match => match.id),
          ...user.blocksOrDeclined.map(block => block.id),
        ])
        )
      },
      relations: ['matches', 'contacts']
    });

    const contact = contacts[Math.floor(Math.random() * contacts.length)]
    if (contact === undefined) throw new BadRequestException('No Contacts found');
    user.contacts = [...user.contacts, contact];
    contact.contacts = [...contact.contacts, user];
    await this.userRepository.save(user);
    await this.userRepository.save(contact);

    return contact;
  }

  /**
   * returns a new contact based on the user's preferences
   */
  async findNewContactPrecise(userID: string): Promise<User> {
    // TODO: implement
    return this.findNewContact(userID);
  }

  /**
   * finds all current open chats and returns the receiver and the last message
   */
  async getChats(id: string): Promise<Chat[]> {
    const user = await this.userRepository.findOne({ id }, { relations: ['matches', 'contacts', 'blocksOrDeclined'] });

    if (user == undefined) throw new BadRequestException('User not found');

    // get all chats where id is in matches or contacts but not in blocksOrDeclined and vise versa
    let tUsers: User[] = [];
    if (user.matches.length > 0 || user.contacts.length > 0) {
      tUsers = await this.userRepository.find({
        where: {
          id: Raw(alias => `
        ${alias} IN (${[...user.matches.map(match => "'" + match.id + "'"), user.contacts.map(contact => "'" + contact.id + "'")].join(', ')})
        AND
        ${alias} NOT IN (${[...user.blocksOrDeclined.map(block => "'" + block.id + "'"), "'" + user.id + "'"].join(', ')})
        `)
        }
      });
    }
    const users = tUsers;

    const chats: Chat[] = [];

    for (let i = 0; i < users.length; i++) {
      const contact = users[i];

      const lastMessage = await this.messageRepository.find({
        where: {
          sender: Any([contact.id, user.id]),
          receiver: Any([contact.id, user.id]),
        },
        order: {
          time: "DESC"
        },
        relations: ['sender', 'receiver'],
        take: 1
      }
      );

      chats.push({
        user: contact,
        lastMessage: lastMessage[0]
      });
    }

    return chats;
  }

  async saveProfilePicture(userID: string, file: Express.Multer.File): Promise<void> {
    const user = await this.userRepository.findOne({ id: userID });

    if (user === undefined) throw new BadRequestException('User not found');

    // move file to profile pictures folder
    fs.mkdirSync(process.cwd() + '/assets/profilePictures', { recursive: true });
    const fileName = userID + extname(file.originalname);
    const filePath = process.cwd() + '/assets/profilePictures/' + fileName;

    fs.copyFileSync(file.path, filePath);

    fs.rmSync(file.path, { recursive: true, force: true });

    user.profilePicture = fileName;
    await this.userRepository.save(user);
    return;
  }

  async getProfilePicture(userID: string): Promise<fs.ReadStream> {
    const user = await this.userRepository.findOne({ id: userID });

    if (user === undefined) throw new BadRequestException('User not found');

    if (!user.profilePicture) throw new NotFoundException('Profile picture not found');

    const file = fs.createReadStream(process.cwd() + '/assets/profilePictures/' + user.profilePicture);

    return file;
  }

  async getPublicProfilePicture(userID: string, profileID: string): Promise<fs.ReadStream> {
    const user = await this.userRepository.findOne({ id: userID }, { relations: ['contacts', 'matches', 'blocksOrDeclined'] });
    const profile = await this.userRepository.findOne({ id: profileID }, { relations: ['contacts', 'matches', 'blocksOrDeclined'] });

    // test if accounts exists
    if (user === undefined) throw new BadRequestException('User not found');
    if (profile === undefined) throw new BadRequestException('Profile not found');

    // test if user is blocked or not in contacts or matches
    if (user.blocksOrDeclined && user.blocksOrDeclined.find(block => block.id === profile.id) !== undefined) throw new ForbiddenException('User is blocked');
    if (!user.contacts || user.contacts.find(contact => contact.id === profile.id) === undefined && user.matches.find(match => match.id === profile.id) === undefined) throw new ForbiddenException('User is not in your contacts or matches');

    // check if profile picture exists
    if (!profile.profilePicture) throw new NotFoundException('Profile picture not found');

    // get files
    const profilePicture = fs.createReadStream(process.cwd() + '/assets/profilePictures/' + profile.profilePicture);
    return profilePicture;
  }
}
