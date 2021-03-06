import {
  ConflictException,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Interests } from 'src/entities/interests.entity';
import { Settings } from 'src/entities/settings.entity';
import { User } from 'src/entities/user.entity';
import { Any, Between, In, Like, Not, Raw, Repository } from 'typeorm';
import { SharedService } from '../shared/shared.service';
import { Message } from '../entities/message.entity';
import * as fs from 'fs';
import { extname } from 'path';
import * as mime from 'mime-types';
import { UserDto } from './user.controller';
import { RegisterBody } from '../entities/user.entity';

export interface Chat {
  user: User;
  lastMessage?: Message;
  isMatch?: boolean;
  isPending?: boolean;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private sharedService: SharedService,
    @InjectRepository(Message) private messageRepository: Repository<Message>
  ) { }

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
    return (await this.userRepository.findOne({ username })) !== undefined;
  }

  /**
   * creates a new user
   */
  async create(user: RegisterBody): Promise<User> {
    if (await this.usernameExists(user.username))
      throw new ConflictException('Username already exists');

    const newUser = new User();
    newUser.username = user.username;
    newUser.password = this.sharedService.hashPasswordSync(user.password);
    newUser.gender = user.gender ?? null;
    newUser.location = user.location ?? null;
    newUser.matches = [];
    newUser.sentMessages = [];
    newUser.receivedMessages = [];

    newUser.settings = new Settings();
    newUser.settings.isDarkMode = user.settings?.isDarkMode !== undefined ? user.settings.isDarkMode : false;
    newUser.settings.discoverable = user.settings?.discoverable !== undefined ? user.settings.discoverable : false;
    newUser.settings.considerPolitics = user.settings?.considerPolitics !== undefined ? user.settings.considerPolitics : true;
    newUser.settings.considerGender = user.settings?.considerGender !== undefined ? user.settings.considerGender : true;
    newUser.settings.reversedPoliticalView = user.settings?.reversedPoliticalView !== undefined ? user.settings.reversedPoliticalView : false;
    newUser.settings.preferredGender = user.settings?.preferredGender ?? [];
    newUser.settings.maxDistance = user.settings?.maxDistance !== undefined ? user.settings.maxDistance : 0;
    newUser.settings.considerHobbies = user.settings?.considerHobbies !== undefined ? user.settings.considerHobbies : true;

    newUser.interests = new Interests();
    newUser.interests.civil = user.interests?.civil ?? null;
    newUser.interests.diplomatic = user.interests?.diplomatic ?? null;
    newUser.interests.economic = user.interests?.economic ?? null;
    newUser.interests.society = user.interests?.society ?? null;

    if (
      newUser.interests.civil &&
      newUser.interests.diplomatic &&
      newUser.interests.economic &&
      newUser.interests.society &&
      user.interests.ideology == null
    ) {
      newUser.interests.ideology = this.sharedService.generateIdeology(
        newUser.interests.civil,
        newUser.interests.diplomatic,
        newUser.interests.economic,
        newUser.interests.society
      );
    } else {
      newUser.interests.ideology = user.interests?.ideology ?? null;
    }

    newUser.interests.hobbies = user.interests?.hobbies ?? null;

    return this.userRepository.save(newUser);
  }

  /**
   * returns a user with all properties (settings, contacts usw.)
   */
  async getFullUser(user: User): Promise<User> {
    const userToReturn = await this.userRepository.findOne(
      { id: user.id },
      { relations: ['settings', 'interests', 'matches', 'blocksOrDeclined', 'contacts'] }
    );
    // strip sensitive information from matches, contacts and blocksorDeclined
    userToReturn.matches = userToReturn.matches.map((match) => {
      return {
        id: match.id,
        username: match.username,
      };
    }) as User[];
    userToReturn.contacts = userToReturn.contacts.map((contact) => {
      return {
        id: contact.id,
        username: contact.username,
      };
    }) as User[];
    userToReturn.blocksOrDeclined = userToReturn.blocksOrDeclined.map((block) => {
      return {
        id: block.id,
        username: block.username,
      };
    }) as User[];
    return userToReturn;
  }

  /**
   * returns the public profile of a random user (stripped of sensitive information)
   */
  async getPublicProfile(userID: string): Promise<User> {
    const userToReturn = await this.userRepository.findOne(
      { id: userID },
      { relations: ['interests'] }
    );
    return userToReturn;
  }

  async updateUser(user: User, update: UserDto): Promise<User> {
    const userToUpdate = await this.userRepository.findOne({ id: user.id }, { relations: ['settings', 'interests'] });
    if (userToUpdate === undefined) throw new BadRequestException('User not found');

    const passwordToHash = update.password ?? userToUpdate.password;

    userToUpdate.username = update.username ?? userToUpdate.username;
    userToUpdate.password = this.sharedService.hashPasswordSync(passwordToHash);
    userToUpdate.gender = update.gender ?? userToUpdate.gender;
    userToUpdate.location = update.location ?? userToUpdate.location;

    return this.userRepository.save(userToUpdate);
  }

  async blockUser(userID: string, blockedUserID: string): Promise<User> {
    if (userID == blockedUserID) throw new BadRequestException('You cannot block yourself');

    const userToUpdate = await this.userRepository.findOne(
      { id: userID },
      { relations: ['blocksOrDeclined', 'matches', 'contacts'] }
    );
    if (userToUpdate === undefined) throw new BadRequestException('User not found');

    const blockedUser = await this.userRepository.findOne(
      { id: blockedUserID },
      { relations: ['blocksOrDeclined', 'matches', 'contacts'] }
    );
    if (blockedUser === undefined) throw new BadRequestException('User to block not found');

    // update user

    // add to block/decline list
    userToUpdate.blocksOrDeclined = [...userToUpdate.blocksOrDeclined, blockedUser];

    // remove from matches
    userToUpdate.matches = userToUpdate.matches.filter((match) => match.id !== blockedUser.id);
    // remove from contacts
    userToUpdate.contacts = userToUpdate.contacts.filter(
      (contact) => contact.id !== blockedUser.id
    );

    // update user to block
    // add to block/decline list
    blockedUser.blocksOrDeclined = [...blockedUser.blocksOrDeclined, userToUpdate];

    // remove from matches
    blockedUser.matches = blockedUser.matches.filter((match) => match.id !== userToUpdate.id);
    // remove from contacts
    blockedUser.contacts = blockedUser.contacts.filter((contact) => contact.id !== userToUpdate.id);

    await this.userRepository.save(blockedUser);

    return this.userRepository.save(userToUpdate);
  }

  /**
   * returns a new contact based on the user's preferences
   */
  async findNewContactPrecise(userID: string): Promise<User> {
    const user = await this.userRepository.findOne(
      { id: userID },
      { relations: ['matches', 'contacts', 'blocksOrDeclined', 'settings', 'interests'] }
    );
    if (user === undefined) throw new BadRequestException('User not found');
    if (user.settings.discoverable === false)
      throw new BadRequestException('User is not discoverable');

    const searchSensitivity = 10;

    const contacts = await this.userRepository.find({
      where: {
        id: Not(
          In([
            user.id,
            ...user.contacts.map((contact) => contact.id),
            ...user.matches.map((match) => match.id),
            ...user.blocksOrDeclined.map((block) => block.id),
          ])
        ),
        settings: {
          discoverable: true,
          considerGender: user.settings.considerGender,
          considerPolitics: user.settings.considerPolitics,
          reversedPoliticalView: user.settings.reversedPoliticalView,
          preferredGender: user.settings.considerGender
            ? Raw((alias) => `'${user.gender}' = ANY (${alias})`)
            : Raw((_alias) => 'true'),
          maxDistance: Raw((alias) => `
            CASE
              WHEN ${alias} = 0 AND ${user.settings.maxDistance} = 0 THEN TRUE
              WHEN ${alias} = 0 AND ${user.settings.maxDistance} != 0 THEN ST_DISTANCE("User"."location",'SRID=4326;POINT(${user.location.coordinates[0]} ${user.location.coordinates[1]})'::geometry) <= ${user.settings.maxDistance} * 1000
              WHEN ${alias} != 0 AND ${user.settings.maxDistance} = 0 THEN ST_DISTANCE("User"."location",'SRID=4326;POINT(${user.location.coordinates[0]} ${user.location.coordinates[1]})'::geometry) <= ${alias} * 1000
              WHEN ${alias} >= ${user.settings.maxDistance} AND ${alias} != 0 AND ${user.settings.maxDistance} != 0 THEN ST_DISTANCE("User"."location",'SRID=4326;POINT(${user.location.coordinates[0]} ${user.location.coordinates[1]})'::geometry) <= ${user.settings.maxDistance} * 1000
              WHEN ${alias} < ${user.settings.maxDistance} AND ${alias} != 0 AND ${user.settings.maxDistance} != 0 THEN ST_DISTANCE("User"."location",'SRID=4326;POINT(${user.location.coordinates[0]} ${user.location.coordinates[1]})'::geometry) <= ${alias} * 1000
            END
          `),
          considerHobbies: user.settings.considerHobbies,
        },
        gender: user.settings.considerGender
          ? Raw(
            (alias) => `
        ${alias} IN (${[...user.settings.preferredGender.map((gender) => "'" + gender + "'")].join(
              ', '
            )})`
          )
          : Like('%'),
        interests: user.settings.considerPolitics
          ? {
            civil: user.settings.reversedPoliticalView
              ? Not(
                Between(
                  user.interests.civil - searchSensitivity,
                  user.interests.civil + searchSensitivity
                )
              )
              : Between(
                user.interests.civil - searchSensitivity,
                user.interests.civil + searchSensitivity
              ),
            diplomatic: user.settings.reversedPoliticalView
              ? Not(
                Between(
                  user.interests.diplomatic - searchSensitivity,
                  user.interests.diplomatic + searchSensitivity
                )
              )
              : Between(
                user.interests.diplomatic - searchSensitivity,
                user.interests.diplomatic + searchSensitivity
              ),
            economic: user.settings.reversedPoliticalView
              ? Not(
                Between(
                  user.interests.economic - searchSensitivity,
                  user.interests.economic + searchSensitivity
                )
              )
              : Between(
                user.interests.economic - searchSensitivity,
                user.interests.economic + searchSensitivity
              ),
            society: user.settings.reversedPoliticalView
              ? Not(
                Between(
                  user.interests.society - searchSensitivity,
                  user.interests.society + searchSensitivity
                )
              )
              : Between(
                user.interests.society - searchSensitivity,
                user.interests.society + searchSensitivity
              ),
            hobbies: user.settings.considerHobbies
              ? Raw(
                (alias) => `
                ${alias} && ${[...user.interests.hobbies.map((hobby) => `'${hobby}'`)].join(', ')}
                `
              )
              : Raw((_alias) => 'TRUE'),
          }
          : {
            hobbies: user.settings.considerHobbies
              ? Raw(
                (alias) => `
                ${alias} && ${[...user.interests.hobbies.map((hobby) => `'${hobby}'`)].join(', ')}
                `
              )
              : Raw((_alias) => `TRUE`),
          },
      },
      relations: ['matches', 'contacts', 'blocksOrDeclined', 'settings', 'interests'],
    });

    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    if (contact === undefined) throw new BadRequestException('No Contacts found');
    user.contacts = [...user.contacts, contact];
    contact.contacts = [...contact.contacts, user];
    await this.userRepository.save(user);
    await this.userRepository.save(contact);
    this.sharedService.generateNewTopic(user.id, contact.id);

    return contact;
  }

  /**
   * finds all current open chats and returns the receiver and the last message
   */
  async getChats(id: string): Promise<Chat[]> {
    const user = await this.userRepository.findOne(
      { id },
      { relations: ['matches', 'contacts', 'blocksOrDeclined'] }
    );

    if (user == undefined) throw new BadRequestException('User not found');

    // get all chats where id is in matches or contacts but not in blocksOrDeclined and vise versa
    let tUsers: User[] = [];
    if (user.matches.length > 0 || user.contacts.length > 0) {
      tUsers = await this.userRepository.find({
        where: {
          id: Raw(
            (alias) => `
        ${alias} IN (${[
                ...user.matches.map((match) => "'" + match.id + "'"),
                user.contacts.map((contact) => "'" + contact.id + "'"),
              ].join(', ')})
        AND
        ${alias} NOT IN (${[
                ...user.blocksOrDeclined.map((block) => "'" + block.id + "'"),
                "'" + user.id + "'",
              ].join(', ')})
        `
          ),
        },
        relations: ['matches'],
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
          time: 'DESC',
        },
        relations: ['sender', 'receiver'],
        take: 1,
      });

      chats.push({
        user: contact,
        lastMessage: lastMessage[0],
        isMatch: user.matches.find((match) => match.id === contact.id) !== undefined && contact.matches.find((match) => match.id === user.id) !== undefined,
        isPending: user.matches.find((match) => match.id === contact.id) === undefined && contact.matches.find((match) => match.id === user.id) !== undefined || user.matches.find((match) => match.id === contact.id) !== undefined && contact.matches.find((match) => match.id === user.id) === undefined,
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

  async getProfilePicture(userID: string) {
    const user = await this.profilePictureChecker(userID);

    const path = process.cwd() + '/assets/profilePictures/' + user.profilePicture;

    const file = fs.readFileSync(path);

    return file;
  }

  async getPublicProfilePicture(userID: string, profileID: string) {
    const profile = await this.publicProfilePictureChecker(userID, profileID);

    // get files
    const path = process.cwd() + '/assets/profilePictures/' + profile.profilePicture;
    const profilePicture = fs.readFileSync(path);
    return profilePicture;
  }

  async getProfilePictureSize(userID: string) {
    const user = await this.profilePictureChecker(userID);

    const file = fs.statSync(process.cwd() + '/assets/profilePictures/' + user.profilePicture);

    return file.size;
  }

  async getProfilePictureType(userID: string) {
    const user = await this.profilePictureChecker(userID);

    return mime.lookup(user.profilePicture) || 'application/octet-stream';
  }

  async getPublicProfilePictureSize(userID: string, profileID: string) {
    const profile = await this.publicProfilePictureChecker(userID, profileID);

    // get files
    const profilePicture = fs.statSync(
      process.cwd() + '/assets/profilePictures/' + profile.profilePicture
    );

    return profilePicture.size;
  }

  async getPublicProfilePictureType(userID: string, profileID: string) {
    const profile = await this.publicProfilePictureChecker(userID, profileID);

    return mime.lookup(profile.profilePicture) || 'application/octet-stream';
  }

  async publicProfilePictureChecker(userID: string, profileID: string): Promise<User> {
    const user = await this.userRepository.findOne(
      { id: userID },
      { relations: ['contacts', 'matches', 'blocksOrDeclined'] }
    );
    const profile = await this.userRepository.findOne(
      { id: profileID },
      { relations: ['contacts', 'matches', 'blocksOrDeclined'] }
    );

    // test if accounts exists
    if (user === undefined) throw new BadRequestException('User not found');
    if (profile === undefined) throw new BadRequestException('Profile not found');

    // test if user is blocked or not in contacts or matches
    if (
      user.blocksOrDeclined &&
      user.blocksOrDeclined.find((block) => block.id === profile.id) !== undefined
    )
      throw new ForbiddenException('User is blocked');
    if (
      !user.contacts ||
      (user.contacts.find((contact) => contact.id === profile.id) === undefined &&
        user.matches.find((match) => match.id === profile.id) === undefined)
    )
      throw new ForbiddenException('User is not in your contacts or matches');

    // check if profile picture exists
    if (!profile.profilePicture) throw new NotFoundException('Profile picture not found');

    return profile;
  }

  async profilePictureChecker(userID: string): Promise<User> {
    const user = await this.userRepository.findOne({ id: userID });

    if (user === undefined) throw new BadRequestException('User not found');

    if (!user.profilePicture) throw new NotFoundException('Profile picture not found');

    return user;
  }

  /**
   * returns true if the two users can matchmake, else throws an error
   */
  async canMatchmake(userID: string, userID2: string): Promise<boolean> {
    if (userID === userID2) throw new BadRequestException('Cannot matchmake with yourself');

    const user1 = await this.userRepository.findOne({ id: userID }, { relations: ['contacts', 'matches', 'blocksOrDeclined'] });
    const user2 = await this.userRepository.findOne({ id: userID2 }, { relations: ['contacts', 'matches', 'blocksOrDeclined'] });

    // test if accounts exists
    if (user1 === undefined) throw new BadRequestException('User not found');
    if (user2 === undefined) throw new BadRequestException('User not found');

    // check that they are contacts, not matched and not blocked
    if (user1.contacts.find((contact) => contact.id == user2.id) === undefined || user2.contacts.find((contact) => contact.id == user1.id) === undefined) {
      throw new ForbiddenException('Users are not in your contacts');
    }

    if (user1.matches.find((match) => match.id == user2.id)) {
      throw new ForbiddenException('Users are already matched');
    }

    if (user1.blocksOrDeclined.find((block) => block.id == user2.id) !== undefined || user2.blocksOrDeclined.find((block) => block.id == user1.id) !== undefined) {
      throw new ForbiddenException('Users are blocked');
    }

    // check if they have more than 10 messages
    const messages = await this.messageRepository.count({
      where: {
        sender: Any([user1.id, user2.id]),
        receiver: Any([user1.id, user2.id]),
      },
    });

    if (messages < 10) {
      throw new ForbiddenException('Users have less than 10 messages');
    } else {
      return true;
    }
  }

  async matchmake(userID: string, userID2: string): Promise<void> {
    if (!await this.canMatchmake(userID, userID2)) {
      throw new ForbiddenException('Users cannot matchmake');
    }
    const user1 = await this.userRepository.findOne({ id: userID }, { relations: ['matches'] });
    const user2 = await this.userRepository.findOne({ id: userID2 }, { relations: ['matches'] });

    // test if accounts exists
    if (user1 === undefined) throw new BadRequestException('User not found');
    if (user2 === undefined) throw new BadRequestException('User not found');

    // add user2 to user1's matches
    user1.matches.push(user2);

    // // add user1 to user2's matches
    // user2.matches.push(user1);

    // save changes
    await this.userRepository.save(user1);
    // await this.userRepository.save(user2);
  }
}
