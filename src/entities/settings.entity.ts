import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IsOptional, IsBoolean } from 'class-validator';

@Entity()
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: false })
  isDarkMode: boolean;

  @Column({ default: true })
  discoverable: boolean;
}

export class SettingsBody {
  @IsOptional()
  @IsBoolean()
  isDarkMode?: boolean;

  @IsOptional()
  @IsBoolean()
  discoverable?: boolean;
}
