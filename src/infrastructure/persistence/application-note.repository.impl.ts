import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  ApplicationNoteForDeletion,
  ApplicationNoteRecord,
  IApplicationNoteRepository,
} from '../../core/repositories/application-note.repository';
import { ApplicationNoteEntity } from '../database/orm/application-note.entity';

type NoteRow = Omit<ApplicationNoteRecord, 'created_at'> & {
  created_at: Date | string;
};

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: NoteRow): ApplicationNoteRecord {
  return { ...row, created_at: asIsoString(row.created_at) };
}

@Injectable()
export class ApplicationNoteRepositoryImpl implements IApplicationNoteRepository {
  constructor(
    @InjectRepository(ApplicationNoteEntity)
    private readonly repository: Repository<ApplicationNoteEntity>,
  ) {}

  async findByApplicationId(applicationId: string): Promise<ApplicationNoteRecord[]> {
    const rows = await this.repository
      .createQueryBuilder('note')
      .innerJoin('note.author', 'author')
      .select('note.id', 'id')
      .addSelect('note.applicationId', 'application_id')
      .addSelect('note.authorId', 'author_id')
      .addSelect('author.name', 'author_name')
      .addSelect('note.content', 'content')
      .addSelect('note.tags', 'tags')
      .addSelect('note.createdAt', 'created_at')
      .where('note.applicationId = :applicationId', { applicationId })
      .orderBy('note.createdAt', 'DESC')
      .getRawMany<NoteRow>();
    return rows.map(toRecord);
  }

  async findForDeletion(id: string): Promise<ApplicationNoteForDeletion | null> {
    const note = await this.repository.findOne({
      where: { id },
      select: { id: true, applicationId: true, authorId: true },
    });
    if (!note) return null;
    return { id: note.id, applicationId: note.applicationId, authorId: note.authorId };
  }

  async create(input: {
    applicationId: string;
    authorId: string;
    content: string;
    tags: string[];
  }): Promise<ApplicationNoteRecord | null> {
    const note = await this.repository.save(this.repository.create(input));
    const rows = await this.repository
      .createQueryBuilder('note')
      .innerJoin('note.author', 'author')
      .select('note.id', 'id')
      .addSelect('note.applicationId', 'application_id')
      .addSelect('note.authorId', 'author_id')
      .addSelect('author.name', 'author_name')
      .addSelect('note.content', 'content')
      .addSelect('note.tags', 'tags')
      .addSelect('note.createdAt', 'created_at')
      .where('note.id = :id', { id: note.id })
      .getRawOne<NoteRow>();
    return rows ? toRecord(rows) : null;
  }

  async deleteByAuthor(id: string, authorId: string): Promise<boolean> {
    const result = await this.repository.delete({ id, authorId });
    return (result.affected ?? 0) > 0;
  }
}
