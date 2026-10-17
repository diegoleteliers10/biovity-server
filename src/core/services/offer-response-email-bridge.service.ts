import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  IOfferResponseEmailIntentRepository,
  OfferResponseEmailIntent,
} from '../repositories/offer-response-email-intent.repository';

@Injectable()
export class OfferResponseEmailBridgeService {
  private readonly logger = new Logger(OfferResponseEmailBridgeService.name);

  constructor(
    @Inject('IOfferResponseEmailIntentRepository')
    private readonly repository: IOfferResponseEmailIntentRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const url = process.env.OFFER_RESPONSE_EMAIL_DISPATCH_URL;
    const secret = process.env.EMAIL_OUTBOX_SECRET;

    const reconciled = await this.repository.reconcilePendingRecipients().then(
      () => true,
      () => false,
    );
    if (!reconciled) {
      this.logger.error('Offer response email recipient reconciliation failed');
      return;
    }
    if (!url || !secret) return;

    const intents = await this.repository.claimDue(20).then(
      result => ({ kind: 'claimed' as const, result }),
      () => ({ kind: 'error' as const }),
    );
    if (intents.kind === 'error') {
      this.logger.error('Offer response email claim failed');
      return;
    }

    for (const intent of intents.result) {
      await this.dispatchOne(url, secret, intent);
    }
  }

  private async dispatchOne(
    url: string,
    secret: string,
    intent: OfferResponseEmailIntent,
  ): Promise<void> {
    const payload = this.payload(intent);
    const result = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
          this.logger.error('Offer response email acceptance update failed'),
      );
      return;
    }
    await this.recordRetry(intent.id, `http_${result.response.status}`);
  }

  private async recordRetry(id: string, errorCode: string): Promise<void> {
    await this.repository.markRetry(id, errorCode).then(
      () => undefined,
      () => this.logger.error('Offer response email retry update failed'),
    );
  }

  private payload(intent: OfferResponseEmailIntent): {
    eventKey: string;
    recipientId: string;
    to: string;
    subject: string;
    html: string;
  } {
    const accepted = intent.response === 'accepted';
    const responseText = accepted ? 'accepted' : 'rejected';
    const candidateName = this.escapeHtml(intent.candidateName);
    const jobTitle = this.escapeHtml(intent.jobTitle);
    const html = `<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;"><h2>${candidateName} ${responseText} the offer</h2><p>The offer response for <strong>${jobTitle}</strong> was ${responseText}.</p><p>Review the offer in your Biovity dashboard.</p></div>`;

    return {
      eventKey: intent.eventKey,
      recipientId: intent.recipientId,
      to: intent.recipientEmail,
      subject: `Offer response ${responseText} | Biovity`,
      html,
    };
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
