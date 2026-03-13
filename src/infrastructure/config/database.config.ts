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
    // Verificar si hay configuración de base de datos local disponible
    const dbHost = config.get<string>('DB_HOST');
    const dbPort = config.get<number>('DB_PORT');
    const dbUsername = config.get<string>('DB_USERNAME');
    const dbPassword = config.get<string>('DB_PASSWORD');
    const dbName = config.get<string>('DB_NAME');

    // Si no hay configuración de base de datos local, usar configuración vacía para evitar errores
    if (!dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
      console.log('⚠️  No se encontró configuración de base de datos local. Usando solo Supabase.');
      return {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'dummy',
        password: 'dummy',
        database: 'dummy',
        entities: [],
        synchronize: false,
        logging: false,
        // Desactivar la conexión real
        retryAttempts: 1,
        retryDelay: 1000,
        keepConnectionAlive: false,
      };
    }

    return {
      type: 'postgres',
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
});
