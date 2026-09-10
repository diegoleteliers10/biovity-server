import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ValidationPipe } from '@nestjs/common';
import { validateEnv } from './infrastructure/config/env.validation';
import {
  DEFAULT_THROTTLE_LIMIT,
  THROTTLE_TTL_MS,
} from './shared/constants/throttling';
import { DatabaseConfig } from './infrastructure/config/database.config';
import { LoggerModule, LoggerMiddleware } from './shared/logger';
import { InterceptorsModule } from './shared/interceptors/interceptors.module';
import { NotificationModule } from './shared/notification';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
} from './shared/filters/http-exception.filter';
import { SessionAuthGuard } from './shared/guards/session-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { LocationInterceptor } from './shared/interceptors/location.interceptor';
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
import { JobAlertModule } from './interfaces/controllers/job-alert/job-alert.module';
import { SalaryModule } from './interfaces/controllers/salary/salary.module';
import { EmailService } from './core/services/email.service';
import { AuthModule } from './shared/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: THROTTLE_TTL_MS,
          limit: DEFAULT_THROTTLE_LIMIT,
        },
      ],
      // Per-instance in-memory tracker: an abuse shield, not a quota (AGENTS-78).
      // Distributed limiting with Upstash lands in AGENTS-21.
      skipIf: () => process.env.NODE_ENV !== 'production',
    }),
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
    JobAlertModule,
    SalaryModule,
  ],
  controllers: [],
  providers: [
    EmailService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // APP_FILTERs run in reverse registration order: HttpExceptionFilter must
    // be declared last so it claims HttpExceptions before the catch-all.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LocationInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
