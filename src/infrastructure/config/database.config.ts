import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../../core/domain/entities/organization.entity';
import { User } from '../../core/domain/entities/user.entity';
// importa más entidades según tengas
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Application } from '../../core/domain/entities/application.entity';
import { Job } from '../../core/domain/entities/job.entity';
import { Resume } from '../../core/domain/entities/resume.entity';
import { Subscription } from '../../core/domain/entities/subscription.entity';

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

    console.log('Database config loaded:', {
      ...dbConfig,
      password: dbConfig.password ? '***HIDDEN***' : 'NOT SET',
    });

    return {
      type: 'postgres',
      ...dbConfig,
      entities: [User, Organization, Application, Job, Resume, Subscription],
      synchronize: true,
      logging: true,
    };
  },
});
