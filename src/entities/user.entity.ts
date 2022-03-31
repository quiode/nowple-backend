import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Settings } from './settings.entity';
import { Message } from './message.entity';
import { Interests } from './interests.entity';

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

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;
}
