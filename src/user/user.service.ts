import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interests } from 'src/entities/interests.entity';
import { Settings } from 'src/entities/settings.entity';
import { User } from 'src/entities/user.entity';
import { In, Not, Repository } from 'typeorm';
import { RegisterBody } from '../auth/auth.controller';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>, private sharedService: SharedService) { }

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

    const matches = await this.userRepository.find({
      where: {
        id: Not(In([
          user.id,
          ...user.contacts.map(contact => contact.id),
          ...user.matches.map(match => match.id),
          ...user.blocksOrDeclined.map(block => block.id),
        ])
        )
      },
      relations: ['matches']
    });

    const match = matches[Math.floor(Math.random() * matches.length)]
    if (match === undefined) throw new BadRequestException('No matches found');
    user.matches = [...user.matches, match];
    match.matches = [...match.matches, user];
    await this.userRepository.save(user);
    await this.userRepository.save(match);

    return match;
  }

  /**
   * returns a new contact based on the user's preferences
   */
  async findNewContactPrecise(userID: string): Promise<User> {
    // TODO: implement
    return this.findNewContact(userID);
  }
}
