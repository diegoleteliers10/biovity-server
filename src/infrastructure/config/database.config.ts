import { TypeOrmModule } from '@nestjs/typeorm';
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
        SubscriptionEntity,
        JobEntity,
        ResumeEntity,
        WaitlistEntity,
        ChatEntity,
        MessageEntity,
      ],
      synchronize: false,
      logging: true,
    };
  },
});
