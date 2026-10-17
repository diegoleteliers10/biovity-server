import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { OfferLetterService } from '../../../core/services/offer-letter.service';
import { OfferLetterController } from './offer-letter.controller';

const applicationId = '11111111-1111-4111-8111-111111111111';
const offerId = '22222222-2222-4222-8222-222222222222';
const candidateId = '33333333-3333-4333-8333-333333333333';
const organizationId = '44444444-4444-4444-8444-444444444444';

const recruiter: AuthenticatedUser = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'recruiter@example.com',
  type: 'organization',
  organizationId,
  memberRole: 'recruiter',
};

const offer = {
  id: offerId,
  applicationId,
  candidateId,
  organizationId,
  status: 'sent',
};

describe('OfferLetterController access checks', () => {
  const service = {
    findById: jest.fn(),
    findByApplicationId: jest.fn(),
    createAndSend: jest.fn(),
    assertCanView: OfferLetterService.prototype.assertCanView,
    respond: jest.fn(),
    resend: jest.fn(),
    cancel: jest.fn(),
  };
  const organizationAccess = {
    assertApplicationAccess: jest.fn(),
  };
  const controller = new OfferLetterController(
    service as unknown as OfferLetterService,
    organizationAccess as unknown as OrganizationAccessService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    service.findById.mockResolvedValue(offer);
    service.findByApplicationId.mockResolvedValue([offer]);
    service.createAndSend.mockResolvedValue({
      offerLetter: offer,
      chatId: null,
    });
    service.respond.mockResolvedValue(offer);
    service.resend.mockResolvedValue(true);
    service.cancel.mockResolvedValue(true);
    organizationAccess.assertApplicationAccess.mockResolvedValue(undefined);
  });

  it('checks recruiter access before creating an offer', async () => {
    organizationAccess.assertApplicationAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.create({ applicationId } as never, recruiter, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      recruiter,
      'recruit',
    );
    expect(service.createAndSend).not.toHaveBeenCalled();
  });

  it('checks organization access before listing application offers', async () => {
    organizationAccess.assertApplicationAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.findByApplication(applicationId, recruiter),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.findByApplicationId).not.toHaveBeenCalled();
  });

  it('checks candidate ownership when a non-organization reads an offer', async () => {
    const otherCandidate: AuthenticatedUser = {
      id: '66666666-6666-4666-8666-666666666666',
      email: 'other@example.com',
      type: 'professional',
      organizationId: null,
    };
    await expect(
      controller.findById(offerId, otherCandidate),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks the organization before resending an offer', async () => {
    organizationAccess.assertApplicationAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.resend(
        offerId,
        {
          expiresOn: '2030-01-01',
          pdfPath: `offer-letters/${applicationId}/offer.pdf`,
        },
        recruiter,
        {} as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.resend).not.toHaveBeenCalled();
  });

  it('checks the organization before cancelling an offer', async () => {
    organizationAccess.assertApplicationAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.cancel(offerId, recruiter, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.cancel).not.toHaveBeenCalled();
  });

  it('passes the authenticated candidate ID to the response service', async () => {
    const candidate: AuthenticatedUser = {
      id: candidateId,
      email: 'candidate@example.com',
      type: 'professional',
      organizationId: null,
    };

    await controller.respond(offerId, { response: 'accepted' }, candidate);

    expect(service.respond).toHaveBeenCalledWith(
      offerId,
      'accepted',
      candidateId,
    );
  });
});
