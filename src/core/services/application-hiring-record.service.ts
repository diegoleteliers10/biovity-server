import { Inject, Injectable } from '@nestjs/common';
import type {
  ApplicationEvaluationRecord,
  IApplicationEvaluationRepository,
  UpsertApplicationEvaluation,
} from '../repositories/application-evaluation.repository';
import type {
  ApplicationNoteForDeletion,
  ApplicationNoteRecord,
  IApplicationNoteRepository,
} from '../repositories/application-note.repository';

@Injectable()
export class ApplicationHiringRecordService {
  constructor(
    @Inject('IApplicationEvaluationRepository')
    private readonly evaluations: IApplicationEvaluationRepository,
    @Inject('IApplicationNoteRepository')
    private readonly notes: IApplicationNoteRepository,
  ) {}

  getEvaluations(applicationIds: readonly string[]): Promise<ApplicationEvaluationRecord[]> {
    return this.evaluations.findByApplicationIds(applicationIds);
  }

  saveEvaluation(
    input: UpsertApplicationEvaluation,
  ): Promise<ApplicationEvaluationRecord | null> {
    return this.evaluations.upsert(input);
  }

  getNotes(applicationId: string): Promise<ApplicationNoteRecord[]> {
    return this.notes.findByApplicationId(applicationId);
  }

  getNoteForDeletion(id: string): Promise<ApplicationNoteForDeletion | null> {
    return this.notes.findForDeletion(id);
  }

  addNote(input: {
    applicationId: string;
    authorId: string;
    content: string;
    tags: string[];
  }): Promise<ApplicationNoteRecord | null> {
    return this.notes.create(input);
  }

  deleteNote(id: string, authorId: string): Promise<boolean> {
    return this.notes.deleteByAuthor(id, authorId);
  }
}
