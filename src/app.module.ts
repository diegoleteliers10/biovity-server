import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseConfig } from './infrastructure/config/database.config';
import { LoggerModule, LoggerMiddleware } from './shared/logger';
import { InterceptorsModule } from './shared/interceptors/interceptors.module';
import { NotificationModule } from './shared/notification';
import { JobModule } from './interfaces/controllers/job/job.module';
import { UserModule } from './interfaces/controllers/user/user.module';
import { OrganizationModule } from './interfaces/controllers/organization/organization.module';
import { ChatModule } from './interfaces/controllers/chat/chat.module';
import { MessageModule } from './interfaces/controllers/message/message.module';
import { ResumeModule } from './interfaces/controllers/resume/resume.module';
import { ApplicationModule } from './interfaces/controllers/application/application.module';
import { SavedJobModule } from './interfaces/controllers/saved-job/saved-job.module';
import { JobQuestionModule } from './interfaces/controllers/job-question/job-question.module';
import { HealthModule } from './interfaces/controllers/health/health.module';
import { AdminModule } from './interfaces/controllers/admin/admin.module';
import { EventModule } from './interfaces/controllers/event/event.module';
import { SubscriptionModule } from './interfaces/controllers/subscription/subscription.module';
import { ApiKeysModule } from './interfaces/controllers/api-keys/api-keys.module';
import { AiCredentialsModule } from './interfaces/controllers/ai-credentials/ai-credentials.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { JobTemplateModule } from './interfaces/controllers/job-template/job-template.module';
import { SavedCandidateModule } from './interfaces/controllers/saved-candidate/saved-candidate.module';
import { CandidateTagModule } from './interfaces/controllers/candidate-tag/candidate-tag.module';
import { MessageTemplateModule } from './interfaces/controllers/message-template/message-template.module';
import { ActivityLogModule } from './interfaces/controllers/activity-log/activity-log.module';
import { ReportsModule } from './interfaces/controllers/reports/reports.module';
import { PipelineStageModule } from './interfaces/controllers/pipeline-stage/pipeline-stage.module';
import { SavedSearchModule } from './interfaces/controllers/saved-search/saved-search.module';
import { SalaryModule } from './interfaces/controllers/salary/salary.module';
import { EmailService } from './core/services/email.service';
import { AuthModule } from './shared/auth/auth.module';
import { SessionAuthGuard } from './shared/guards/session-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    InterceptorsModule,
    NotificationModule,
    DatabaseConfig,
    CryptoModule,
    AuthModule,
    JobModule,
    UserModule,
    OrganizationModule,
    ChatModule,
    MessageModule,
    ResumeModule,
    ApplicationModule,
    SavedJobModule,
    HealthModule,
    EventModule,
    SubscriptionModule,
    JobQuestionModule,
    ApiKeysModule,
    AiCredentialsModule,
    AdminModule,
    JobTemplateModule,
    SavedCandidateModule,
    CandidateTagModule,
    MessageTemplateModule,
    ActivityLogModule,
    ReportsModule,
    PipelineStageModule,
    SavedSearchModule,
    SalaryModule,
  ],
  controllers: [],
  providers: [
    EmailService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
