import { DomainException } from './domain.exception';

export class UnauthorizedException extends DomainException {
  constructor(message: string = 'Unauthorized access', path?: string) {
    super(message, 401, path);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string = 'Access forbidden', path?: string) {
    super(message, 403, path);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor(path?: string) {
    super('Invalid email or password', path);
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor(path?: string) {
    super('Token has expired', path);
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor(path?: string) {
    super('Invalid or malformed token', path);
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(requiredPermission?: string, path?: string) {
    const message = requiredPermission
      ? `Insufficient permissions. Required: ${requiredPermission}`
      : 'Insufficient permissions to perform this action';
    super(message, path);
  }
}

export class EmailNotVerifiedException extends UnauthorizedException {
  constructor(path?: string) {
    super('Email address must be verified to access this resource', path);
  }
}

export class AccountInactiveException extends UnauthorizedException {
  constructor(path?: string) {
    super('Account is inactive. Please contact support', path);
  }
}
