import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne((type) => User, (user) => user.sentMessages, { nullable: false, eager: true }) sender: User;

  @ManyToOne((type) => User, (user) => user.receivedMessages, { nullable: false, eager: true }) receiver: User;

  @Column({ nullable: true })
  message: string;

  @Column({ type: 'timestamp' })
  time: Date;

  @Column({ default: false })
  isTopic: boolean;
}