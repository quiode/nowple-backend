import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { Gender } from '../shared/genders';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isDarkMode: boolean;

  @Column({ default: true })
  discoverable: boolean;

  @Column({ default: true })
  considerPolitics: boolean;

  @Column({ default: true })
  considerGender: boolean;

  @Column({ default: false })
  reversedPoliticalView: boolean;

  @Column('enum', { array: true, enum: Gender, default: [] })
  preferredGender: Gender[];

  // in km, 0 = off
  @Column({ default: 10 })
  maxDistance: number;

  @Column({ default: false })
  considerHobbies: boolean;
}

export class SettingsBody {
  @IsOptional()
  @IsBoolean()
  isDarkMode?: boolean;

  @IsOptional()
  @IsBoolean()
  discoverable?: boolean;

  @IsOptional()
  @IsBoolean()
  considerPolitics?: boolean;

  @IsOptional()
  @IsBoolean()
  considerGender?: boolean;

  @IsOptional()
  @IsBoolean()
  reversedPoliticalView?: boolean;

  @IsOptional()
  @IsEnum(Gender, { each: true })
  preferredGender?: Gender[];

  @IsOptional()
  @IsNumber()
  maxDistance?: number;

  @IsOptional()
  @IsBoolean()
  considerHobbies?: boolean;
}
