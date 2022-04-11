import { Module } from '@nestjs/common';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interests } from '../entities/interests.entity';
import { User } from '../entities/user.entity';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Interests, User]), SharedModule],
  controllers: [InterestsController],
  providers: [InterestsService],
})
export class InterestsModule {}
