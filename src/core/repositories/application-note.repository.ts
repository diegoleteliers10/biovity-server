export type ApplicationNoteRecord = {
  id: string;
  application_id: string;
  author_id: string;
  author_name: string;
  content: string;
  tags: string[];
  created_at: string;
};

export type ApplicationNoteForDeletion = {
  id: string;
  applicationId: string;
  authorId: string;
};

export interface IApplicationNoteRepository {
  findByApplicationId(applicationId: string): Promise<ApplicationNoteRecord[]>;
  findForDeletion(id: string): Promise<ApplicationNoteForDeletion | null>;
  create(input: {
    applicationId: string;
    authorId: string;
    content: string;
    tags: string[];
  }): Promise<ApplicationNoteRecord | null>;
  deleteByAuthor(id: string, authorId: string): Promise<boolean>;
}
