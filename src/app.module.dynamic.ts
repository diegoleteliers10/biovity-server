import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseModule } from './infrastructure/database/supabase.module';
import { SupabaseTestModule } from './interfaces/controllers/supabase-test/supabase-test.module';

@Module({})
export class AppModule {
  static forRoot(): DynamicModule {
    const configService = new ConfigService();
    
    // Verificar si hay configuración de base de datos local
    const hasLocalDb = configService.get<string>('DB_HOST') &&
                      configService.get<string>('DB_USERNAME') &&
                      configService.get<string>('DB_PASSWORD') &&
                      configService.get<string>('DB_NAME');

    const imports = [
      ConfigModule.forRoot({ isGlobal: true }),
      SupabaseModule,
      SupabaseTestModule,
    ];

    // Solo agregar módulos TypeORM si hay configuración de base de datos local
    if (hasLocalDb) {
      console.log('✅ Configuración de base de datos local encontrada. Usando TypeORM.');
      // Importar dinámicamente los módulos que dependen de TypeORM
      const { JobModule } = require('./interfaces/controllers/job/job.module');
      const { UserModule } = require('./interfaces/controllers/user/user.module');
      const { OrganizationModule } = require('./interfaces/controllers/organization/organization.module');
      const { ChatModule } = require('./interfaces/controllers/chat/chat.module');
      const { MessageModule } = require('./interfaces/controllers/message/message.module');
      
      imports.push(JobModule, UserModule, OrganizationModule, ChatModule, MessageModule);
    } else {
      console.log('⚠️  No se encontró configuración de base de datos local. Usando solo Supabase.');
    }

    return {
      module: AppModule,
      imports,
      controllers: [],
      providers: [],
    };
  }
}