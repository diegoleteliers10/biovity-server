import { OrganizationVerificationEmailBridgeService } from './organization-verification-email-bridge.service';

const intent = {
  id: 'intent-id',
  eventKey: 'organization-verification:intent-id',
  requestId: 'request-id',
  legalName: 'Example <Research>',
  recipientEmail: 'admin@example.com',
  attemptCount: 1,
};

const makeRepository = () => ({
  claimDue: jest.fn().mockResolvedValue([intent]),
  markAccepted: jest.fn().mockResolvedValue(undefined),
  markRetry: jest.fn().mockResolvedValue(undefined),
});

describe('OrganizationVerificationEmailBridgeService', () => {
  const originalUrl = process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL;
  const originalSecret = process.env.EMAIL_OUTBOX_SECRET;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalUrl === undefined)
      delete process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL;
    else process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.EMAIL_OUTBOX_SECRET;
    else process.env.EMAIL_OUTBOX_SECRET = originalSecret;
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('sends escaped content to the private outbox endpoint and accepts the intent', async () => {
    process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL =
      'https://biovity.example/api/internal/organization-verification-email';
    process.env.EMAIL_OUTBOX_SECRET = 'secret';
    process.env.NEXT_PUBLIC_APP_URL = 'https://biovity.example/';
    const repository = makeRepository();
    let sentBody = '';
    jest.spyOn(global, 'fetch').mockImplementation((_url, options) => {
      sentBody = typeof options?.body === 'string' ? options.body : '';
      return Promise.resolve(new Response(null, { status: 202 }));
    });
    const service = new OrganizationVerificationEmailBridgeService(repository);

    await service.dispatch();

    const sentPayload = JSON.parse(sentBody) as {
      eventKey: string;
      requestId: string;
      to: string;
      subject: string;
      html: string;
    };
    expect(repository.claimDue).toHaveBeenCalledWith(20);
    expect(sentPayload.eventKey).toBe(intent.eventKey);
    expect(sentPayload.requestId).toBe(intent.requestId);
    expect(sentPayload.to).toBe(intent.recipientEmail);
    expect(sentPayload.subject).toBe(
      'Nueva solicitud de verificación | Example <Research>',
    );
    expect(sentPayload.html).toContain('Example &lt;Research&gt;');
    expect(sentPayload.html).toContain(
      'https://biovity.example/dashboard/organizations',
    );
    expect(repository.markAccepted).toHaveBeenCalledWith('intent-id');
    expect(repository.markRetry).not.toHaveBeenCalled();
  });

  it('schedules a retry when the private endpoint fails', async () => {
    process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL =
      'https://biovity.example/api/internal/organization-verification-email';
    process.env.EMAIL_OUTBOX_SECRET = 'secret';
    const repository = makeRepository();
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }));
    const service = new OrganizationVerificationEmailBridgeService(repository);

    await service.dispatch();

    expect(repository.markRetry).toHaveBeenCalledWith('intent-id', 'http_503');
    expect(repository.markAccepted).not.toHaveBeenCalled();
  });

  it('does not claim intents when the endpoint is not configured', async () => {
    delete process.env.ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL;
    process.env.EMAIL_OUTBOX_SECRET = 'secret';
    const repository = makeRepository();
    const service = new OrganizationVerificationEmailBridgeService(repository);

    await service.dispatch();

    expect(repository.claimDue).not.toHaveBeenCalled();
  });
});
