import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Settings, SettingsBody } from './settings.entity';
import { Message } from './message.entity';
import { Interests, InterestsBody } from './interests.entity';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Settings, { cascade: true })
  @JoinColumn()
  settings: Settings;

  @OneToOne(() => Interests, { cascade: true })
  @JoinColumn()
  interests: Interests;

  @OneToMany((type) => Message, (message) => message.sender, { nullable: true, cascade: true })
  sentMessages: Message[];

  @OneToMany((type) => Message, (message) => message.receiver, { nullable: true, cascade: true })
  receivedMessages: Message[];

  @ManyToMany(() => User, { nullable: true })
  @JoinTable()
  matches: User[];

  @ManyToMany(() => User, { nullable: true })
  @JoinTable()
  blocksOrDeclined: User[];

  @ManyToMany(() => User, { nullable: true })
  @JoinTable()
  contacts: User[];

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  profilePicture: string;
}

export class RegisterBody {
  @IsNotEmpty()
  @IsString()
  username: string;
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsObject()
  settings?: SettingsBody;

  @IsOptional()
  @IsObject()
  interests?: InterestsBody;

  @IsOptional()
  @IsString()
  profilePicture?: string;
}
