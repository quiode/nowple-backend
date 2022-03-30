import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity()
export class Interests {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  authoritarian: number;

  @Column()
  economicRight: number;

  @Column()
  economicLeft: number;

  @Column()
  libertarian: number;
}