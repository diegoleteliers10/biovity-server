import { Global, Module } from '@nestjs/common';
import { BetterAuthSessionService } from './better-auth-session.service';
import { SessionAuthGuard } from '../guards/session-auth.guard';
import { OrganizationAccessService } from './organization-access.service';

@Global()
@Module({
  providers: [
    BetterAuthSessionService,
    SessionAuthGuard,
    OrganizationAccessService,
  ],
  exports: [
    BetterAuthSessionService,
    SessionAuthGuard,
    OrganizationAccessService,
  ],
})
export class AuthModule {}
