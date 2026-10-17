import { OfferLetterRepositoryImpl } from './offer-letter.repository.impl';
import { OfferLetter } from '../../core/domain/entities';

describe('OfferLetterRepositoryImpl.createWithMessage', () => {
  it('creates the candidate notification intent in the offer transaction', async () => {
    const manager = {
      save: jest.fn().mockResolvedValue({
        id: 'offer-id',
        applicationId: 'application-id',
        jobId: 'job-id',
        organizationId: 'organization-id',
        candidateId: 'candidate-id',
        status: 'sent',
        letterData: { jobTitle: 'Bioquímico' },
      }),
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'chat-id' }])
        .mockResolvedValueOnce([{ id: 'message-id' }])
        .mockResolvedValueOnce([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = jest.fn(operation => operation(manager));
    const repository = new OfferLetterRepositoryImpl({
      manager: { transaction },
    } as never);
    const offerLetter = new OfferLetter(
      '',
      'application-id',
      'job-id',
      'organization-id',
      'candidate-id',
      'sent',
      {
        companyName: 'Bio',
        candidateName: 'Candidato',
        jobTitle: 'Bioquímico',
      },
    );

    await repository.createWithMessage({
      offerLetter,
      recruiterId: 'recruiter-id',
      messageTitle: 'Nueva oferta',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO message_notification_intent'),
      ['message-id', 'chat-id', 'candidate-id'],
    );
  });
});

describe('OfferLetterRepositoryImpl.updateStatus', () => {
  it('only updates an offer that is still sent', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const findById = jest.fn().mockResolvedValue(null);
    const repository = new OfferLetterRepositoryImpl({
      update,
      findOne: findById,
    } as never);

    await repository.updateStatus('offer-1', 'accepted');

    expect(update).toHaveBeenCalledWith(
      { id: 'offer-1', status: 'sent' },
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('returns null when another response already changed the offer', async () => {
    const findOne = jest.fn();
    const repository = new OfferLetterRepositoryImpl({
      update: jest.fn().mockResolvedValue({ affected: 0 }),
      findOne,
    } as never);

    await expect(
      repository.updateStatus('offer-1', 'rejected'),
    ).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});

describe('OfferLetterRepositoryImpl.resend', () => {
  it('saves the new deadline and PDF path with the resend transaction', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { chat_id: 'chat-id', candidate_id: 'candidate-id', title: 'Offer' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'new-message-id' }])
      .mockResolvedValue([]);
    const transaction = jest.fn(operation => operation({ query }));
    const repository = new OfferLetterRepositoryImpl({
      manager: { transaction },
    } as never);

    await repository.resend(
      'offer-id',
      'organization-id',
      'actor-id',
      '2026-10-30',
      'offer-letters/application-id/updated.pdf',
    );

    expect(query.mock.calls[0][0]).toContain('pdf_path = $4');
    expect(query.mock.calls[0][0]).toContain(
      "jsonb_set(letter_data, '{offerValidUntil}'",
    );
    expect(query.mock.calls[0][1]).toEqual([
      'offer-id',
      'organization-id',
      '2026-10-30',
      'offer-letters/application-id/updated.pdf',
    ]);
    expect(query.mock.calls[1][0]).toContain(
      "content_type->>'offerLetterId' = $1",
    );
    expect(query.mock.calls[1][0]).toContain('\'"superseded"\'');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
