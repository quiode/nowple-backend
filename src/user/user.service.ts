import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interests } from 'src/entities/interests.entity';
import { Settings } from 'src/entities/settings.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterBody } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>, private sharedService: SharedService) {}

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
      newUser.interests.authoritarian = user.interests?.authoritarian ?? null;
      newUser.interests.economicRight = user.interests?.economicRight ?? null;
      newUser.interests.economicLeft = user.interests?.economicLeft ?? null;
      newUser.interests.libertarian = user.interests?.libertarian ?? null;

      return this.userRepository.save(newUser);
  }
}
