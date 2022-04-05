import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Ideology } from '../shared/ideologies';
@Entity()
export class Interests {
  @PrimaryGeneratedColumn()
  id: number;

  // https://8values.github.io/ 
  @Column({ nullable: true })
  economic: number;

  @Column({ nullable: true })
  diplomatic: number;

  @Column({ nullable: true })
  civil: number;

  @Column({ nullable: true })
  society: number;

  @Column({ nullable: true, type: 'enum', enum: Ideology })
  ideology: Ideology;
}