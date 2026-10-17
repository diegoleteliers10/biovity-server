import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  WaitlistEntity,
  ApplicationEntity,
  ChatEntity,
  JobEntity,
  MessageEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { AdminController } from './admin.controller';
import { AdminService } from '../../../core/services/admin.service';
import { AdminContactInquiriesService } from '../../../core/services/admin-contact-inquiries.service';
import { AdminContactInquiriesController } from './admin-contact-inquiries.controller';
import { AdminOperationsQueueController } from './admin-operations-queue.controller';
import { AdminOperationsQueueService } from '../../../core/services/admin-operations-queue.service';
import { AdminLegacyChatsController } from './admin-legacy-chats.controller';
import { AdminLegacyChatsService } from '../../../core/services/admin-legacy-chats.service';
import { ChatRepositoryImpl } from '../../../infrastructure/persistence/chat.repository.impl';
import { NotificationModule } from '../../../shared/notification';
import { CandidateDataLifecycleService } from '../../../core/services/candidate-data-lifecycle.service';
import { AdminCandidateDataController } from './admin-candidate-data.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WaitlistEntity,
      ApplicationEntity,
      ChatEntity,
      JobEntity,
      MessageEntity,
      OrganizationEntity,
    ]),
    NotificationModule,
  ],
  controllers: [
    AdminController,
    AdminContactInquiriesController,
    AdminOperationsQueueController,
    AdminLegacyChatsController,
    AdminCandidateDataController,
  ],
  providers: [
    AdminService,
    AdminContactInquiriesService,
    AdminOperationsQueueService,
    AdminLegacyChatsService,
    CandidateDataLifecycleService,
    { provide: 'IChatRepository', useClass: ChatRepositoryImpl },
  ],
  exports: [AdminService, CandidateDataLifecycleService],
})
export class AdminModule {}
