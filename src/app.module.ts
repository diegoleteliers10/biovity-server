import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './infrastructure/database/supabase.module';
import { SupabaseTestModule } from './interfaces/controllers/supabase-test/supabase-test.module';
import { LoggerModule, LoggerMiddleware } from './shared/logger';
import { HealthModule } from './interfaces/controllers/health/health.module';

// Importar dinámicamente los módulos que dependen de TypeORM
let JobModule: any;
let UserModule: any;
let OrganizationModule: any;
let ChatModule: any;
let MessageModule: any;
let ResumeModule: any;
let ApplicationModule: any;
let ConditionalDatabaseModule: any;

try {
  // Verificar si hay configuración de base de datos local
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    // Verificar que las variables existan y NO estén comentadas
    const hasDbHost = envLines.some((line: string) => line.trim().startsWith('DB_HOST='));
    const hasDbUser = envLines.some((line: string) => line.trim().startsWith('DB_USERNAME='));
    const hasDbPass = envLines.some((line: string) => line.trim().startsWith('DB_PASSWORD='));
    const hasDbName = envLines.some((line: string) => line.trim().startsWith('DB_NAME='));
    
    const hasDbConfig = hasDbHost && hasDbUser && hasDbPass && hasDbName;
    
    if (hasDbConfig) {
      ConditionalDatabaseModule = require('./infrastructure/config/conditional-database.module').ConditionalDatabaseModule;
      JobModule = require('./interfaces/controllers/job/job.module').JobModule;
      UserModule = require('./interfaces/controllers/user/user.module').UserModule;
      OrganizationModule = require('./interfaces/controllers/organization/organization.module').OrganizationModule;
      ChatModule = require('./interfaces/controllers/chat/chat.module').ChatModule;
      MessageModule = require('./interfaces/controllers/message/message.module').MessageModule;
      ResumeModule = require('./interfaces/controllers/resume/resume.module').ResumeModule;
      ApplicationModule = require('./interfaces/controllers/application/application.module').ApplicationModule;
      console.log('✅ Configuración de base de datos local encontrada. Usando TypeORM.');
    } else {
      console.log('⚠️  No se encontró configuración de base de datos local. Usando solo Supabase.');
    }
  } else {
    console.log('⚠️  No se encontró archivo .env. Usando solo Supabase.');
  }
} catch (error) {
  console.log('⚠️  Error al verificar configuración de base de datos. Usando solo Supabase.');
}

const imports: any[] = [
  ConfigModule.forRoot({ isGlobal: true }),
  SupabaseModule,
  SupabaseTestModule,
  LoggerModule,
  HealthModule,
];

// Agregar módulos TypeORM solo si están disponibles
if (ConditionalDatabaseModule) {
  imports.push(ConditionalDatabaseModule.forRoot());
}
if (JobModule) imports.push(JobModule);
if (UserModule) imports.push(UserModule);
if (OrganizationModule) imports.push(OrganizationModule);
if (ChatModule) imports.push(ChatModule);
if (MessageModule) imports.push(MessageModule);
if (ResumeModule) imports.push(ResumeModule);
if (ApplicationModule) imports.push(ApplicationModule);

@Module({
  imports,
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
