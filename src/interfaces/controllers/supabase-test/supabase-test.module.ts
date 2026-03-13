import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../../infrastructure/database/supabase.module';
import { SupabaseTestController } from './supabase-test.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [SupabaseTestController],
})
export class SupabaseTestModule {}
