import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  WaitlistEntity,
  ApplicationEntity,
  JobEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { AdminController } from './admin.controller';
import { AdminService } from '../../../core/services/admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WaitlistEntity,
      ApplicationEntity,
      JobEntity,
      OrganizationEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}