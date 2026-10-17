import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ResumeCvLifecycleService } from './resume-cv-lifecycle.service';
import { ResumeEntity } from '../../infrastructure/database/orm/resume.entity';

describe('ResumeCvLifecycleService', () => {
  const resume = {
    id: 'resume-id',
    userId: 'user-id',
    cvFile: { path: 'cv/user-id/old.pdf', url: 'https://storage/old.pdf' },
    cvVersion: 4,
  };
  const manager = { query: jest.fn() } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(async callback => callback(manager)),
    getRepository: jest.fn(() => ({
      findOne: jest.fn(async () =>
        Object.assign(new ResumeEntity(), { ...resume, cvVersion: 5 }),
      ),
    })),
    query: jest.fn(),
  } as unknown as DataSource;
  const service = new ResumeCvLifecycleService(dataSource);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a reservation when the resume version changed', async () => {
    jest.mocked(manager.query).mockResolvedValueOnce([resume]);

    await expect(service.reserve(resume.id, 3)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  it('finalizes the upload and queues the replaced path in the same transaction', async () => {
    jest
      .mocked(manager.query)
      .mockResolvedValueOnce([resume])
      .mockResolvedValueOnce([
        {
          id: 'reservation-id',
          path: 'cv/user-id/new.pdf',
          expected_version: 4,
          status: 'active',
        },
      ])
      .mockResolvedValueOnce([{ id: resume.id }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.finalize(resume.id, 'reservation-id', {
      url: 'https://storage/new.pdf',
      originalName: 'cv.pdf',
      mimeType: 'application/pdf',
      size: 512,
    });

    expect(result.cvVersion).toBe(5);
    expect(manager.query).toHaveBeenCalledTimes(5);
    expect(jest.mocked(manager.query).mock.calls[4]?.[0]).toContain(
      'INSERT INTO public.resume_cv_cleanup',
    );
    expect(
      jest
        .mocked(manager.query)
        .mock.calls.some(([query]) =>
          String(query).includes('INSERT INTO candidate_profile_change'),
        ),
    ).toBe(false);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('clears the current CV and creates a cleanup intent atomically', async () => {
    jest
      .mocked(manager.query)
      .mockResolvedValueOnce([resume])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.delete(resume.id, 'cv/user-id/old.pdf', 4);

    expect(manager.query).toHaveBeenCalledTimes(3);
    expect(jest.mocked(manager.query).mock.calls[2]?.[0]).toContain(
      'INSERT INTO public.resume_cv_cleanup',
    );
    expect(
      jest
        .mocked(manager.query)
        .mock.calls.some(([query]) =>
          String(query).includes('INSERT INTO candidate_profile_change'),
        ),
    ).toBe(false);
  });

  it('expires upload reservations and protects legacy Storage URLs before cleanup', async () => {
    jest
      .mocked(manager.query)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'cleanup-id',
          path: 'cv/user-id/old.pdf',
          bucket: 'biovity_cv',
          lease_token: 'lease-id',
        },
      ]);

    const items = await service.claim(20);

    expect(items).toEqual([
      {
        id: 'cleanup-id',
        path: 'cv/user-id/old.pdf',
        bucket: 'biovity_cv',
        leaseToken: 'lease-id',
      },
    ]);
    const [expiryQuery] = jest.mocked(manager.query).mock.calls[0] ?? [];
    const [claimQuery] = jest.mocked(manager.query).mock.calls[1] ?? [];
    expect(expiryQuery).toContain('expires_at <= now()');
    expect(expiryQuery).toContain("SET status = 'expired'");
    expect(claimQuery).toContain(
      "right(split_part(a.resume_url, '?', 1), length(q.object_path))",
    );
    expect(claimQuery).toContain("replace(q.object_path, '/', '%2f')");
    expect(claimQuery).toContain(
      'LIMIT $1\n            FOR UPDATE SKIP LOCKED',
    );
  });

  it('enqueues the active CV and upload reservations before deleting a resume', async () => {
    jest
      .mocked(manager.query)
      .mockResolvedValueOnce([resume])
      .mockResolvedValueOnce([{ path: 'cv/user-id/inflight.pdf' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.deleteResume(resume.id);

    expect(manager.query).toHaveBeenCalledTimes(7);
    expect(jest.mocked(manager.query).mock.calls[3]).toEqual([
      expect.stringContaining('INSERT INTO public.resume_cv_cleanup'),
      ['cv/user-id/old.pdf', 'biovity_cv'],
    ]);
    expect(jest.mocked(manager.query).mock.calls[4]).toEqual([
      expect.stringContaining('INSERT INTO public.resume_cv_cleanup'),
      ['cv/user-id/inflight.pdf', 'biovity_cv'],
    ]);
    expect(jest.mocked(manager.query).mock.calls[5]?.[0]).toContain(
      'DELETE FROM public.resume',
    );
    expect(jest.mocked(manager.query).mock.calls[6]?.[0]).toContain(
      'INSERT INTO candidate_profile_change',
    );
  });

  it('rechecks signed application URLs before completing cleanup', async () => {
    jest
      .mocked(manager.query)
      .mockResolvedValueOnce([{ path: 'cv/user-id/old.pdf' }])
      .mockResolvedValueOnce([{ referenced: true }])
      .mockResolvedValueOnce([]);

    await expect(service.finish('cleanup-id', 'lease-id')).resolves.toBe(
      'protected',
    );
    expect(jest.mocked(manager.query).mock.calls[1]?.[0]).toContain(
      "split_part(resume_url, '?', 1)",
    );
  });
});
