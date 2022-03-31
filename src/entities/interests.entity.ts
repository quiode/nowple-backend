import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity()
export class Interests {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  authoritarian: number;

  @Column({nullable: true})
  economicRight: number;

  @Column({nullable: true})
  economicLeft: number;

  @Column({nullable: true})
  libertarian: number;
}