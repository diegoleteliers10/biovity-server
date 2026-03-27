import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfig } from './infrastructure/config/database.config';
import { LoggerModule, LoggerMiddleware } from './shared/logger';
import { InterceptorsModule } from './shared/interceptors/interceptors.module';
import { JobModule } from './interfaces/controllers/job/job.module';
import { UserModule } from './interfaces/controllers/user/user.module';
import { OrganizationModule } from './interfaces/controllers/organization/organization.module';
import { ChatModule } from './interfaces/controllers/chat/chat.module';
import { MessageModule } from './interfaces/controllers/message/message.module';
import { ResumeModule } from './interfaces/controllers/resume/resume.module';
import { ApplicationModule } from './interfaces/controllers/application/application.module';
import { SavedJobModule } from './interfaces/controllers/saved-job/saved-job.module';
import { HealthModule } from './interfaces/controllers/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    InterceptorsModule,
    DatabaseConfig,
    JobModule,
    UserModule,
    OrganizationModule,
    ChatModule,
    MessageModule,
    ResumeModule,
    ApplicationModule,
    SavedJobModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
