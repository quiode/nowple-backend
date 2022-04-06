import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from '../shared/shared.module';
import { Message } from '../entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Message]), SharedModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule { }
