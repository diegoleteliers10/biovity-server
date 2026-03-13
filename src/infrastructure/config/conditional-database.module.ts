import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Global()
@Module({})
export class ConditionalDatabaseModule {
  static forRoot() {
    return {
      module: ConditionalDatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const dbHost = configService.get<string>('DB_HOST');
            const dbPort = configService.get<number>('DB_PORT');
            const dbUsername = configService.get<string>('DB_USERNAME');
            const dbPassword = configService.get<string>('DB_PASSWORD');
            const dbName = configService.get<string>('DB_NAME');

            if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
              console.log('⚠️  No se encontró configuración de base de datos local. El servidor funcionará solo con Supabase.');
              return {
                type: 'postgres' as const,
                host: 'localhost',
                port: 5432,
                username: 'dummy',
                password: 'dummy',
                database: 'dummy',
                entities: [],
                synchronize: false,
                logging: false,
                retryAttempts: 1,
                retryDelay: 1000,
                keepConnectionAlive: false,
              };
            }

            return {
              type: 'postgres' as const,
              host: dbHost,
              port: dbPort,
              username: dbUsername,
              password: dbPassword,
              database: dbName,
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
        }),
      ],
    };
  }

  static forFeature(entities: any[]) {
    return TypeOrmModule.forFeature(entities);
  }
}