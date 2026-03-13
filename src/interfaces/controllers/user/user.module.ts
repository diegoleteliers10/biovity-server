import { Module } from '@nestjs/common';
import { ConditionalDatabaseModule } from '../../../infrastructure/config/conditional-database.module';
import { UserEntity } from '../../../infrastructure/database/orm';
import { UserController } from './user.controller';
import { UserService } from '../../../core/services/user.service';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [ConditionalDatabaseModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
