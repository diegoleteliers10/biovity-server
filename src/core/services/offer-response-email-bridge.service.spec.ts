import { OfferResponseEmailBridgeService } from './offer-response-email-bridge.service';

describe('OfferResponseEmailBridgeService', () => {
  const originalUrl = process.env.OFFER_RESPONSE_EMAIL_DISPATCH_URL;
  const originalSecret = process.env.EMAIL_OUTBOX_SECRET;

  afterEach(() => {
    if (originalUrl === undefined)
      delete process.env.OFFER_RESPONSE_EMAIL_DISPATCH_URL;
    else process.env.OFFER_RESPONSE_EMAIL_DISPATCH_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.EMAIL_OUTBOX_SECRET;
    else process.env.EMAIL_OUTBOX_SECRET = originalSecret;
    jest.restoreAllMocks();
  });

  it('stores a safe retry result when the private endpoint rejects the request', async () => {
    const intent = {
      id: 'intent-1',
      eventKey: 'offer-response:offer-1',
      offerId: 'offer-1',
      organizationId: 'org-1',
      response: 'accepted' as const,
      recipientId: 'recruiter-1',
      recipientEmail: 'recruiter@example.com',
      candidateName: 'Ana Candidate',
      jobTitle: 'Engineer',
      attemptCount: 1,
    };
    const repository = {
      claimDue: jest.fn().mockResolvedValue([intent]),
      markAccepted: jest.fn().mockResolvedValue(undefined),
      markRetry: jest.fn().mockResolvedValue(undefined),
      reconcilePendingRecipients: jest.fn().mockResolvedValue(undefined),
    };
    process.env.OFFER_RESPONSE_EMAIL_DISPATCH_URL =
      'https://biovity.example/api/internal/offer-response-email';
    process.env.EMAIL_OUTBOX_SECRET = 'test-secret';
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }));
    const service = new OfferResponseEmailBridgeService(repository as never);

    await service.dispatch();

    expect(fetch).toHaveBeenCalledWith(
      'https://biovity.example/api/internal/offer-response-email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-secret',
        }),
      }),
    );
    const request = fetch.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      eventKey: 'offer-response:offer-1',
      recipientId: 'recruiter-1',
      to: 'recruiter@example.com',
      subject: 'Offer response accepted | Biovity',
    });
    expect(payload.html).toContain(
      'offer response for <strong>Engineer</strong> was accepted',
    );
    expect(payload.html).not.toContain('Contratado');
    expect(repository.markRetry).toHaveBeenCalledWith('intent-1', 'http_503');
    expect(repository.markAccepted).not.toHaveBeenCalled();
  });
});
