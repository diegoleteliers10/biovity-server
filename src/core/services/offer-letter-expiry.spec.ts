import { OfferLetterService } from './offer-letter.service';

describe('OfferLetterService.expireDueOffers', () => {
  it('claims a bounded batch and updates messages and audit rows in one query', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const transaction = jest.fn(operation => operation({ query }));
    const service = new OfferLetterService(
      {} as never,
      {} as never,
      {} as never,
      { transaction } as never,
    );

    await service.expireDueOffers();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.mock.calls[0][0]).toContain('LIMIT 100');
    expect(query.mock.calls[0][0]).toContain('offer_letter_action_audit');
  });
});

describe('OfferLetterService.resend', () => {
  it('rejects a PDF path outside the offer application folder', async () => {
    const resend = jest.fn();
    const service = new OfferLetterService(
      {
        findById: jest.fn().mockResolvedValue({
          applicationId: 'application-id',
          organizationId: 'organization-id',
        }),
        resend,
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.resend(
        'offer-id',
        'actor-id',
        '2026-10-30',
        'offer-letters/another-application/private.pdf',
      ),
    ).resolves.toBe('invalid_pdf_path');
    expect(resend).not.toHaveBeenCalled();
  });
});
