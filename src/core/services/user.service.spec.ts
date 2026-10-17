import { User } from '../domain/entities/user.entity';
import {
  CandidateAvailability,
  CandidateSeniority,
  UserType,
} from '../domain/enums';
import { IUserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

describe('UserService candidate search profile', () => {
  const existingUser = new User(
    'user-id',
    'candidate@example.com',
    'Candidate',
    UserType.PROFESSIONAL,
    false,
    true,
    undefined,
    undefined,
    undefined,
    new Date(),
    new Date(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    0,
    undefined,
    undefined,
    undefined,
    CandidateSeniority.SENIOR,
    CandidateAvailability.TWO_WEEKS,
  );

  it('passes only submitted fields to the repository', async () => {
    const update = jest.fn().mockResolvedValue(existingUser);
    const findById = jest.fn();
    const repository = {
      findById,
      update,
    } as unknown as IUserRepository;
    const service = new UserService(repository);

    await service.updateUser('user-id', { name: 'New name' });

    expect(update).toHaveBeenCalledWith('user-id', { name: 'New name' });
    expect(findById).not.toHaveBeenCalled();
  });

  it('clears declared values when the profile sends null', async () => {
    const update = jest.fn().mockResolvedValue(existingUser);
    const repository = {
      findById: jest.fn().mockResolvedValue(existingUser),
      update,
    } as unknown as IUserRepository;
    const service = new UserService(repository);

    await service.updateUser('user-id', {
      experienceLevel: null,
      availability: null,
    });

    expect(update).toHaveBeenCalledWith('user-id', {
      experienceLevel: null,
      availability: null,
    });
  });
});
