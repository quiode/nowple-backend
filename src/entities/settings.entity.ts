import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Settings{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: false })
    isDarkMode: boolean;
}