import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AccountEntity,
  UserEntity,
  ApplicationEntity,
  OrganizationEntity,
  SubscriptionEntity,
  JobEntity,
  ResumeEntity,
  SessionEntity,
  VerificationEntity,
} from '../database/orm';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DatabaseConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    // Debug rápido de todas las variables
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
        AccountEntity,
        UserEntity,
        OrganizationEntity,
        ApplicationEntity,
        SubscriptionEntity,
        JobEntity,
        ResumeEntity,
        SessionEntity,
        VerificationEntity,
      ],
      synchronize: false,
      logging: true,
    };
  },
});
