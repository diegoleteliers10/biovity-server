import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  ApplicationEntity,
  ApplicationAnswerEntity,
  OrganizationEntity,
  SubscriptionEntity,
  JobEntity,
  JobQuestionEntity,
  ResumeEntity,
  WaitlistEntity,
  ChatEntity,
  MessageEntity,
  SavedJobEntity,
  EventEntity,
  EventNoteEntity,
} from '../database/orm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DatabaseConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const dbConfig = {
      host: config.get<string>('DB_HOST'),
      port: config.get<number>('DB_PORT'),
      username: config.get<string>('DB_USERNAME'),
      password: config.get<string>('DB_PASSWORD'),
      database: config.get<string>('DB_NAME'),
    };

    return {
      type: 'postgres',
      ...dbConfig,
      entities: [
        UserEntity,
        OrganizationEntity,
        ApplicationEntity,
        ApplicationAnswerEntity,
        SubscriptionEntity,
        JobEntity,
        JobQuestionEntity,
        ResumeEntity,
        WaitlistEntity,
        ChatEntity,
        MessageEntity,
        SavedJobEntity,
        EventEntity,
        EventNoteEntity,
      ],
      synchronize: false,
      logging: true,
    };
  },
});
