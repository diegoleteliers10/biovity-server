import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfig } from './infrastructure/config/database.config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseConfig],
  controllers: [],
  providers: [],
})
export class AppModule {}
