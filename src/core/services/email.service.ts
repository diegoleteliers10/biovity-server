import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'Biovity <no-reply@biovity.cl>';

    if (!this.resend) {
      return Promise.reject(new Error('RESEND_API_KEY is not configured'));
    }

    const { error } = await this.resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: body,
    });

    if (error) {
      console.error('[EmailService] Error sending email via Resend:', error);
      return Promise.reject(
        new Error(`Failed to send email: ${error.message}`),
      );
    }
  }
}
