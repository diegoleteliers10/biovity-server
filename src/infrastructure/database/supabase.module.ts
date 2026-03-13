import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseConfig } from '../config/supabase.config';
import { SupabaseService } from './supabase.service';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseConfig, SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
