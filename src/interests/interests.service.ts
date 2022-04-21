import { Injectable, NotFoundException } from '@nestjs/common';
import { Interests, InterestsBody } from '../entities/interests.entity';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SharedService } from '../shared/shared.service';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Interests) private interestsRepository: Repository<Interests>,
    private sharedService: SharedService
  ) {}

  /**
   * get Interests
   */
  async getInterests(userId: string): Promise<Interests> {
    const user = await this.userRepository.findOne({ id: userId }, { relations: ['interests'] });
    return user.interests;
  }

  /**
   * update Interests
   */
  async updateInterests(userId: string, body: InterestsBody): Promise<Interests> {
    const user = await this.userRepository.findOne({ id: userId }, { relations: ['interests'] });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const interests: Interests = user.interests;
    interests.civil = body.civil ?? interests.civil;
    interests.diplomatic = body.diplomatic ?? interests.diplomatic;
    interests.economic = body.economic ?? interests.economic;
    interests.society = body.society ?? interests.society;
    interests.ideology = this.sharedService.generateIdeology(
      interests.civil,
      interests.diplomatic,
      interests.economic,
      interests.society
    );

    return this.interestsRepository.save(interests);
  }
}
