import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { ApplicationHiringRecordService } from '../../../core/services/application-hiring-record.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { ApplicationEvaluationDto } from '../../dtos/application/application-evaluation.dto';
import { ApplicationHiringRecordController } from './application-hiring-record.controller';

describe('ApplicationHiringRecordController', () => {
  const requester: AuthenticatedUser = {
    id: 'f4884d6f-9c4f-4b9c-8ac7-4a2e95a2ec8f',
    email: 'recruiter@example.com',
    type: 'organization',
    organizationId: '0177072b-1e2e-4517-9f44-8dcd2b79d699',
  };

  const applicationId = '170fc483-4432-4cfc-984d-2ac11a4de883';
  const noteId = '68b1e9fc-7e93-4e1e-8f3c-a36fa48cf98e';
  const invalidEvaluations: ApplicationEvaluationDto[] = [
    {
      applicationId,
      rating: 'positive',
      skillsAssessment: { technical: '6' },
    },
    {
      applicationId,
      rating: 'positive',
      skillsAssessment: { context: 'other' },
    },
    { applicationId, rating: 'negative', skillsAssessment: {} },
  ];
  let service: jest.Mocked<ApplicationHiringRecordService>;
  let access: jest.Mocked<OrganizationAccessService>;
  let controller: ApplicationHiringRecordController;

  beforeEach(() => {
    service = {
      getEvaluations: jest.fn(),
      saveEvaluation: jest.fn(),
      getNotes: jest.fn(),
      getNoteForDeletion: jest.fn(),
      addNote: jest.fn(),
      deleteNote: jest.fn(),
    } as unknown as jest.Mocked<ApplicationHiringRecordService>;
    access = {
      assertApplicationAccess: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OrganizationAccessService>;
    controller = new ApplicationHiringRecordController(service, access);
  });

  it('authorizes each requested evaluation application for recruiting', async () => {
    service.getEvaluations.mockResolvedValue([]);
    const secondApplicationId = '2fc1496c-43eb-4896-a00c-163894ba823e';

    await controller.getEvaluations(
      undefined,
      `${applicationId},${secondApplicationId}`,
      requester,
    );

    expect(access.assertApplicationAccess).toHaveBeenNthCalledWith(
      1,
      applicationId,
      requester,
      'recruit',
    );
    expect(access.assertApplicationAccess).toHaveBeenNthCalledWith(
      2,
      secondApplicationId,
      requester,
      'recruit',
    );
    expect(service.getEvaluations).toHaveBeenCalledWith([
      applicationId,
      secondApplicationId,
    ]);
  });

  it('blocks evaluation reads when application access is denied', async () => {
    access.assertApplicationAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.getEvaluations(applicationId, undefined, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getEvaluations).not.toHaveBeenCalled();
  });

  it('upserts one evaluation for the current recruiter', async () => {
    service.saveEvaluation.mockResolvedValue({} as never);

    await controller.saveEvaluation(
      {
        applicationId,
        rating: 'positive',
        skillsAssessment: { technical: '5' },
      },
      requester,
    );

    expect(access.assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      requester,
      'recruit',
    );
    expect(service.saveEvaluation).toHaveBeenCalledWith({
      applicationId,
      evaluatorId: requester.id,
      rating: 'positive',
      notes: null,
      skillsAssessment: { technical: '5' },
    });
  });

  it.each(invalidEvaluations)(
    'rejects invalid scorecards before saving',
    async input => {
      await expect(
        controller.saveEvaluation(input, requester),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(access.assertApplicationAccess).not.toHaveBeenCalled();
      expect(service.saveEvaluation).not.toHaveBeenCalled();
    },
  );

  it('requires recruiting access to read internal notes', async () => {
    service.getNotes.mockResolvedValue([]);

    await controller.getNotes(applicationId, requester);

    expect(access.assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      requester,
      'recruit',
    );
    expect(service.getNotes).toHaveBeenCalledWith(applicationId);
  });

  it('requires the note author and application access before deletion', async () => {
    service.getNoteForDeletion.mockResolvedValue({
      id: noteId,
      applicationId,
      authorId: 'cbf94348-6e46-4231-bdae-ea0eb505f911',
    });

    await expect(
      controller.deleteNote(noteId, requester),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      requester,
      'recruit',
    );
    expect(service.deleteNote).not.toHaveBeenCalled();
  });

  it('deletes an internal note authored by the recruiter', async () => {
    service.getNoteForDeletion.mockResolvedValue({
      id: noteId,
      applicationId,
      authorId: requester.id,
    });
    service.deleteNote.mockResolvedValue(true);

    await expect(controller.deleteNote(noteId, requester)).resolves.toEqual({
      success: true,
    });
    expect(service.deleteNote).toHaveBeenCalledWith(noteId, requester.id);
  });

  it('blocks a mixed evaluation batch when one application denies access', async () => {
    const deniedApplicationId = '2fc1496c-43eb-4896-a00c-163894ba823e';
    access.assertApplicationAccess
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ForbiddenException());

    await expect(
      controller.getEvaluations(
        undefined,
        `${applicationId},${deniedApplicationId}`,
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.assertApplicationAccess).toHaveBeenCalledWith(
      deniedApplicationId,
      requester,
      'recruit',
    );
    expect(service.getEvaluations).not.toHaveBeenCalled();
  });

  it('blocks evaluation writes when recruiting access is denied', async () => {
    access.assertApplicationAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.saveEvaluation(
        { applicationId, rating: 'positive' },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.saveEvaluation).not.toHaveBeenCalled();
  });

  it('blocks internal note reads when recruiting access is denied', async () => {
    access.assertApplicationAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.getNotes(applicationId, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getNotes).not.toHaveBeenCalled();
  });

  it('blocks note creation when recruiting access is denied', async () => {
    access.assertApplicationAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.addNote(
        { applicationId, content: 'Interview feedback' },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.addNote).not.toHaveBeenCalled();
  });

  it('blocks note deletion after metadata lookup when access is denied', async () => {
    service.getNoteForDeletion.mockResolvedValue({
      id: noteId,
      applicationId,
      authorId: requester.id,
    });
    access.assertApplicationAccess.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.deleteNote(noteId, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.getNoteForDeletion).toHaveBeenCalledWith(noteId);
    expect(service.deleteNote).not.toHaveBeenCalled();
  });

  it('returns not found for a missing note without attempting deletion', async () => {
    service.getNoteForDeletion.mockResolvedValue(null);

    await expect(
      controller.deleteNote(noteId, requester),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertApplicationAccess).not.toHaveBeenCalled();
    expect(service.deleteNote).not.toHaveBeenCalled();
  });

  it('returns not found when an authorized note delete affects no record', async () => {
    service.getNoteForDeletion.mockResolvedValue({
      id: noteId,
      applicationId,
      authorId: requester.id,
    });
    service.deleteNote.mockResolvedValue(false);

    await expect(
      controller.deleteNote(noteId, requester),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(service.deleteNote).toHaveBeenCalledWith(noteId, requester.id);
  });

  it('returns a server error when an evaluation write has no returned record', async () => {
    service.saveEvaluation.mockResolvedValue(null);

    await expect(
      controller.saveEvaluation(
        { applicationId, rating: 'positive' },
        requester,
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('returns a server error when a note write has no returned record', async () => {
    service.addNote.mockResolvedValue(null);

    await expect(
      controller.addNote(
        { applicationId, content: 'Interview feedback' },
        requester,
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('propagates an evaluation write failure without returning success', async () => {
    const failure = new Error('Evaluation write failed');
    service.saveEvaluation.mockRejectedValue(failure);

    await expect(
      controller.saveEvaluation(
        { applicationId, rating: 'positive' },
        requester,
      ),
    ).rejects.toBe(failure);
  });

  it('propagates a note creation failure without returning success', async () => {
    const failure = new Error('Note creation failed');
    service.addNote.mockRejectedValue(failure);

    await expect(
      controller.addNote(
        { applicationId, content: 'Interview feedback' },
        requester,
      ),
    ).rejects.toBe(failure);
  });

  it('propagates a note deletion failure without returning success', async () => {
    const failure = new Error('Note deletion failed');
    service.getNoteForDeletion.mockResolvedValue({
      id: noteId,
      applicationId,
      authorId: requester.id,
    });
    service.deleteNote.mockRejectedValue(failure);

    await expect(controller.deleteNote(noteId, requester)).rejects.toBe(
      failure,
    );
  });
});
