import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfig } from './infrastructure/config/database.config';
import { JobModule } from './interfaces/controllers/job/job.module';
import { UserModule } from './interfaces/controllers/user/user.module';
import { OrganizationModule } from './interfaces/controllers/organization/organization.module';
import { ChatModule } from './interfaces/controllers/chat/chat.module';
import { MessageModule } from './interfaces/controllers/message/message.module';
import { ResumeModule } from './interfaces/controllers/resume/resume.module';
import { ApplicationModule } from './interfaces/controllers/application/application.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseConfig,
    JobModule,
    UserModule,
    OrganizationModule,
    ChatModule,
    MessageModule,
    ResumeModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
