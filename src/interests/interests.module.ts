import { Module } from '@nestjs/common';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interests } from '../entities/interests.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Interests, User])],
  controllers: [InterestsController],
  providers: [InterestsService]
})
export class InterestsModule { }
