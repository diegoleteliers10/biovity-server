import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  WaitlistEntity,
  ApplicationEntity,
  JobEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { OrganizationMemberEntity } from '../../../infrastructure/database/orm/organization-member.entity';
import { AdminController } from './admin.controller';
import { AdminService } from '../../../core/services/admin.service';
import { NotificationModule } from '../../../shared/notification';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WaitlistEntity,
      ApplicationEntity,
      JobEntity,
      OrganizationEntity,
      OrganizationMemberEntity,
    ]),
    NotificationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
