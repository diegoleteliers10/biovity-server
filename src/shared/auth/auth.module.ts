import { Global, Module } from '@nestjs/common';
import { BetterAuthSessionService } from './better-auth-session.service';
import { SessionAuthGuard } from '../guards/session-auth.guard';

@Global()
@Module({
  providers: [BetterAuthSessionService, SessionAuthGuard],
  exports: [BetterAuthSessionService, SessionAuthGuard],
})
export class AuthModule {}
