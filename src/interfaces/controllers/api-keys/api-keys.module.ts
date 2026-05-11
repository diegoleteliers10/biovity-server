import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyEntity } from '../../../infrastructure/database/orm/api-key.entity';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from '../../../core/services/api-keys.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
