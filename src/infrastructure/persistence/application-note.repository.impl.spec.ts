import type { Repository } from 'typeorm';
import { ApplicationNoteRepositoryImpl } from './application-note.repository.impl';
import { ApplicationNoteEntity } from '../database/orm/application-note.entity';

describe('ApplicationNoteRepositoryImpl', () => {
  it('deletes a note only when both note and author match', async () => {
    const repository = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as Repository<ApplicationNoteEntity>;
    const implementation = new ApplicationNoteRepositoryImpl(repository);
    const id = '68b1e9fc-7e93-4e1e-8f3c-a36fa48cf98e';
    const authorId = 'f4884d6f-9c4f-4b9c-8ac7-4a2e95a2ec8f';

    await expect(implementation.deleteByAuthor(id, authorId)).resolves.toBe(true);
    expect(repository.delete).toHaveBeenCalledWith({ id, authorId });
  });
});
