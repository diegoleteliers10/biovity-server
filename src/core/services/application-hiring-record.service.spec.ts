import type { IApplicationEvaluationRepository } from '../repositories/application-evaluation.repository';
import type { IApplicationNoteRepository } from '../repositories/application-note.repository';
import { ApplicationHiringRecordService } from './application-hiring-record.service';

describe('ApplicationHiringRecordService write failures', () => {
  const applicationId = '170fc483-4432-4cfc-984d-2ac11a4de883';
  const authorId = 'f4884d6f-9c4f-4b9c-8ac7-4a2e95a2ec8f';
  const noteId = '68b1e9fc-7e93-4e1e-8f3c-a36fa48cf98e';
  let evaluations: jest.Mocked<IApplicationEvaluationRepository>;
  let notes: jest.Mocked<IApplicationNoteRepository>;
  let service: ApplicationHiringRecordService;

  beforeEach(() => {
    evaluations = {
      findByApplicationIds: jest.fn(),
      upsert: jest.fn(),
    };
    notes = {
      findByApplicationId: jest.fn(),
      findForDeletion: jest.fn(),
      create: jest.fn(),
      deleteByAuthor: jest.fn(),
    };
    service = new ApplicationHiringRecordService(evaluations, notes);
  });

  it('propagates a rejected evaluation upsert without returning a record', async () => {
    const failure = new Error('Evaluation repository unavailable');
    evaluations.upsert.mockRejectedValue(failure);

    await expect(
      service.saveEvaluation({
        applicationId,
        evaluatorId: authorId,
        rating: 'positive',
        notes: null,
        skillsAssessment: {},
      }),
    ).rejects.toBe(failure);
  });

  it('propagates rejected note creation without returning a record', async () => {
    const failure = new Error('Note repository unavailable');
    notes.create.mockRejectedValue(failure);

    await expect(
      service.addNote({
        applicationId,
        authorId,
        content: 'Interview feedback',
        tags: [],
      }),
    ).rejects.toBe(failure);
  });

  it('propagates rejected note deletion without reporting success', async () => {
    const failure = new Error('Note deletion unavailable');
    notes.deleteByAuthor.mockRejectedValue(failure);

    await expect(service.deleteNote(noteId, authorId)).rejects.toBe(failure);
  });
});
