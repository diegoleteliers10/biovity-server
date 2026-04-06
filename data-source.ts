import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  UserEntity,
  ApplicationEntity,
  OrganizationEntity,
  SubscriptionEntity,
  JobEntity,
  ResumeEntity,
  WaitlistEntity,
  ChatEntity,
  MessageEntity,
  SavedJobEntity,
  EventEntity,
  EventNoteEntity,
} from './src/infrastructure/database/orm';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    UserEntity,
    ApplicationEntity,
    OrganizationEntity,
    SubscriptionEntity,
    JobEntity,
    ResumeEntity,
    WaitlistEntity,
    ChatEntity,
    MessageEntity,
    SavedJobEntity,
    EventEntity,
    EventNoteEntity,
  ],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
