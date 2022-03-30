import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne((type) => User, (user) => user.sentMessages) sender: User;

  @ManyToOne((type) => User, (user) => user.receivedMessages) receiver: User;

  @Column({ nullable: true })
  message: string;

  @Column({ type: 'timestamp' })
  time: Date;
}