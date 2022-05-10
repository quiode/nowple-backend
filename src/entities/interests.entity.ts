import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Ideology } from '../shared/ideologies';
import { IsOptional, IsNumber, IsPositive, IsEnum } from 'class-validator';
import { Hobbies } from 'src/shared/hobbies';
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

  @Column('enum', { default: [], array: true, enum: Hobbies })
  hobbies: Hobbies[];
}

export class InterestsBody {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  economic?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  diplomatic?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  civil?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  society?: number;

  @IsOptional()
  @IsEnum(Ideology)
  ideology?: Ideology;

  @IsOptional()
  @IsEnum(Hobbies, { each: true })
  hobbies?: Hobbies[];
}
