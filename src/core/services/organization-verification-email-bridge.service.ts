import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  OrganizationVerificationEmailIntent,
  OrganizationVerificationEmailIntentRepository,
} from '../repositories/organization-verification-email-intent.repository';

@Injectable()
export class OrganizationVerificationEmailBridgeService {
  private readonly logger = new Logger(
    OrganizationVerificationEmailBridgeService.name,
  );

  constructor(
    @Inject('OrganizationVerificationEmailIntentRepository')
    private readonly repository: OrganizationVerificationEmailIntentRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const url = process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL;
    const secret = process.env.EMAIL_OUTBOX_SECRET;
    if (!url || !secret) return;

    const intents = await this.repository.claimDue(20).then(
      result => ({ kind: 'claimed' as const, result }),
      () => ({ kind: 'error' as const }),
    );
    if (intents.kind === 'error') {
      this.logger.error('Organization verification email claim failed');
      return;
    }
    for (const intent of intents.result) {
      await this.dispatchOne(url, secret, intent);
    }
  }

  private async dispatchOne(
    url: string,
    secret: string,
    intent: OrganizationVerificationEmailIntent,
  ): Promise<void> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://biovity.cl';
    const verificationUrl = `${appUrl.replace(/\/$/, '')}/dashboard/organizations`;
    const organizationName = this.escapeHtml(intent.legalName);
    const safeUrl = this.escapeHtml(verificationUrl);
    const result = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventKey: intent.eventKey,
        requestId: intent.requestId,
        to: intent.recipientEmail,
        subject: `Nueva solicitud de verificación | ${intent.legalName.replace(/[\r\n]+/g, ' ').trim()}`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;"><h2>Nueva solicitud de verificación</h2><p>${organizationName} envió una solicitud de verificación legal.</p><p><a href="${safeUrl}">Revisar solicitud en Biovity</a></p></div>`,
      }),
      signal: AbortSignal.timeout(20_000),
    }).then(
      response => ({ kind: 'response' as const, response }),
      () => ({ kind: 'network_error' as const }),
    );

    if (result.kind === 'network_error') {
      await this.recordRetry(intent.id, 'network_error');
      return;
    }
    if (result.response.ok) {
      await this.repository.markAccepted(intent.id).then(
        () => undefined,
        () =>
          this.logger.error(
            'Organization verification email acceptance update failed',
          ),
      );
      return;
    }
    await this.recordRetry(intent.id, `http_${result.response.status}`);
  }

  private async recordRetry(id: string, errorCode: string): Promise<void> {
    await this.repository.markRetry(id, errorCode).then(
      () => undefined,
      () =>
        this.logger.error(
          'Organization verification email retry update failed',
        ),
    );
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, character => {
      const replacements: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return replacements[character] ?? character;
    });
  }
}
