import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { EncryptionService } from '../crypto/encryption.service';

export const INTERNAL_SECRET_HEADER = 'x-internal-key';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly crypto: EncryptionService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) {
      throw new UnauthorizedException(
        'Internal API key is not configured on the server',
      );
    }

    const provided = request.headers[INTERNAL_SECRET_HEADER];
    const providedStr = Array.isArray(provided)
      ? provided[0] ?? ''
      : provided ?? '';

    if (!providedStr || !this.crypto.constantTimeEqual(providedStr, expected)) {
      throw new UnauthorizedException('Invalid internal credentials');
    }

    return true;
  }
}
