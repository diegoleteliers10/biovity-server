import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  ApplicationAnswerEntity,
  OrganizationEntity,
  SubscriptionEntity,
  JobEntity,
  JobQuestionEntity,
  ResumeEntity,
  WaitlistEntity,
  ChatEntity,
  MessageEntity,
  SavedJobEntity,
  EventEntity,
  EventNoteEntity,
  EventParticipantEntity,
  ApiKeyEntity,
  AiCredentialEntity,
  OrganizationMemberEntity,
  SavedCandidateEntity,
  CandidateTagEntity,
  CandidateTagAssignmentEntity,
  MessageTemplateEntity,
  ActivityLogEntity,
  SalarySubmissionEntity,
} from '../database/orm';
import { JobTemplateEntity } from '../database/orm/job-template.entity';
import { PipelineStageEntity } from '../database/orm/pipeline-stage.entity';
import { SavedSearchEntity } from '../database/orm/saved-search.entity';
import { JobAlertEntity } from '../database/orm/job-alert.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const DatabaseConfig = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
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
        UserEntity,
        OrganizationEntity,
        ApplicationEntity,
        ApplicationStatusHistoryEntity,
        ApplicationAnswerEntity,
        SubscriptionEntity,
        JobEntity,
        JobQuestionEntity,
        ResumeEntity,
        WaitlistEntity,
        ChatEntity,
        MessageEntity,
        SavedJobEntity,
        EventEntity,
        EventNoteEntity,
        EventParticipantEntity,
        ApiKeyEntity,
        AiCredentialEntity,
        OrganizationMemberEntity,
        JobTemplateEntity,
        SavedCandidateEntity,
        CandidateTagEntity,
        CandidateTagAssignmentEntity,
        MessageTemplateEntity,
        ActivityLogEntity,
        PipelineStageEntity,
        SavedSearchEntity,
        JobAlertEntity,
        SalarySubmissionEntity,
      ],
      synchronize: false,
      logging: true,
    };
  },
});
