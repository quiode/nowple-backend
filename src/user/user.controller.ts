import {
  Controller,
  Get,
  Req,
  UseGuards,
  InternalServerErrorException,
  Param,
  BadRequestException,
  Patch,
  Body,
  Post,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService, Chat } from './user.service';
import { IsOptional, IsString, IsEnum, IsObject } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { SharedService } from '../shared/shared.service';
import { Gender } from '../shared/genders';
import { isProduction } from '../shared/constants';
import { Point } from 'geojson';

export class UserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsObject()
  location?: Point;
}
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private sharedService: SharedService) { }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    const user = await this.userService.getFullUser(req.user as User);
    const { password, ...returnVal } = user;
    return returnVal;
  }

  @UseGuards(JwtAuthGuard)
  @Get('public/:id')
  async getUser(@Req() req: Request, @Param('id') id: string) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (await this.sharedService.isBlocked((req.user as User).id, id)) {
      throw new BadRequestException('User is blocked');
    }

    const publicProfile = await this.userService.getPublicProfile(id);
    if (!publicProfile) {
      throw new BadRequestException('User not found');
    }
    const { password, ...strippedProfile } = publicProfile;
    return strippedProfile;
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateUser(@Body() body: UserDto, @Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    const user = await this.userService.updateUser(req.user as User, req.body);
    const { password, ...returnVal } = user;
    return returnVal;
  }

  @UseGuards(JwtAuthGuard)
  @Post('block/:id')
  async blockUser(@Req() req: Request, @Param('id') id: string) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (await this.sharedService.isBlocked((req.user as User).id, id)) {
      throw new BadRequestException('User is already blocked');
    }

    const user = await this.userService.blockUser((req.user as User).id, id);
    const {
      password,
      blocksOrDeclined,
      contacts,
      matches,
      sentMessages,
      receivedMessages,
      ...returnVal
    } = user;
    const blocks = blocksOrDeclined.map((block) => {
      return { id: block.id, username: block.username };
    });
    return { ...returnVal, blocks };
  }

  @UseGuards(JwtAuthGuard)
  @Post('find')
  async matchUser(@Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    const user = await this.userService.findNewContactPrecise((req.user as User).id);
    const { password, matches, contacts, ...returnVal } = user;
    return returnVal;
  }

  @UseGuards(JwtAuthGuard)
  @Get('chats')
  async getChats(@Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    const chats: Chat[] = await this.userService.getChats((req.user as User).id);
    // remove password and other sensitive data
    const strippedChats = chats.map((chat) => {
      const { password, ...user } = chat.user;
      return { user, lastMessage: chat.lastMessage, isMatch: chat.isMatch, isPending: chat.isPending };
    });
    return strippedChats;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profilePicture', { dest: process.cwd() + '/uploads/profilePictures' })
  )
  @Post('profilePicture')
  async setProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ): Promise<void> {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    return this.userService.saveProfilePicture((req.user as User).id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profilePicture')
  async getProfilePicture(@Req() req: Request) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }
    const size = await this.userService.getProfilePictureSize((req.user as User).id);
    const type = await this.userService.getProfilePictureType((req.user as User).id);
    if (!size || !type) {
      throw new NotFoundException('User not found');
    }
    const file = await this.userService.getProfilePicture((req.user as User).id);
    return new StreamableFile(file, { length: size, type: type });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profilePicture/:id')
  async getPublicProfilePicture(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    if (await this.sharedService.isBlocked((req.user as User).id, id)) {
      throw new BadRequestException('User is blocked');
    }

    const size = await this.userService.getPublicProfilePictureSize((req.user as User).id, id);
    const type = await this.userService.getPublicProfilePictureType((req.user as User).id, id);
    if (!size || !type) {
      throw new NotFoundException('User not found');
    }
    const file = await this.userService.getPublicProfilePicture((req.user as User).id, id);
    return new StreamableFile(file, { length: size, type: type });
  }

  @UseGuards(JwtAuthGuard)
  @Get('canMatchmake/:id')
  async canMatchmake(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    const canMatchmake = await this.userService.canMatchmake((req.user as User).id, id);
    return canMatchmake;
  }

  @UseGuards(JwtAuthGuard)
  @Post('matchmake/:id')
  async matchmake(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    if (!(req.user as User)) {
      throw new InternalServerErrorException('User not found');
    }

    await this.userService.matchmake((req.user as User).id, id);
    return true;
  }
}
