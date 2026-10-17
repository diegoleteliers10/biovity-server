import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EncryptionService } from '../crypto/encryption.service';
import { InternalSecretGuard } from './internal-secret.guard';

const contextOf = (
  headers: Record<string, string | string[] | undefined>,
): ExecutionContext => {
  const request = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('InternalSecretGuard', () => {
  const constantTimeEqual = jest.fn(
    (provided: string, expected: string) => provided === expected,
  );
  const guard = new InternalSecretGuard({
    constantTimeEqual,
  } as unknown as EncryptionService);

  beforeEach(() => {
    process.env.INTERNAL_API_KEY = 'internal-secret';
    constantTimeEqual.mockClear();
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it('accepts the internal key on a route with the local guard', () => {
    expect(
      guard.canActivate(contextOf({ 'x-internal-key': 'internal-secret' })),
    ).toBe(true);
    expect(constantTimeEqual).toHaveBeenCalledWith(
      'internal-secret',
      'internal-secret',
    );
  });

  it('rejects an invalid key', () => {
    expect(() =>
      guard.canActivate(contextOf({ 'x-internal-key': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a missing key', () => {
    expect(() => guard.canActivate(contextOf({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests when the server key is not configured', () => {
    delete process.env.INTERNAL_API_KEY;

    expect(() =>
      guard.canActivate(contextOf({ 'x-internal-key': 'internal-secret' })),
    ).toThrow(UnauthorizedException);
  });
});
