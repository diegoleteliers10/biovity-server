import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserEntity,
  ApplicationEntity,
  EventEntity,
  JobEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { UserController } from './user.controller';
import { UserMetricsController } from './user-metrics.controller';
import { UserService } from '../../../core/services/user.service';
import { UserMetricsService } from '../../../core/services/user-metrics.service';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      ApplicationEntity,
      EventEntity,
      JobEntity,
      OrganizationEntity,
    ]),
  ],
  controllers: [UserController, UserMetricsController],
  providers: [
    UserService,
    UserMetricsService,
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [UserService, UserMetricsService],
})
export class UserModule {}
