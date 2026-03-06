import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../../infrastructure/database/orm';
import { UserController } from './user.controller';
import { UserService } from '../../../core/services/user.service';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
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
