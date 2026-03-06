import { DomainException } from './domain.exception';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationException extends DomainException {
  public readonly errors: ValidationError[];

  constructor(
    message: string = 'Validation failed',
    errors: ValidationError[] = [],
    path?: string,
  ) {
    super(message, 400, path);
    this.errors = errors;
  }

  /**
   * Add a validation error to the list
   */
  addError(field: string, message: string, value?: unknown): void {
    this.errors.push({ field, message, value });
  }

  /**
   * Check if there are any validation errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Convert exception to JSON format including validation errors
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

export class InvalidEmailException extends ValidationException {
  constructor(email?: string, path?: string) {
    super(
      'Invalid email format',
      email
        ? [{ field: 'email', message: 'Invalid email format', value: email }]
        : [],
      path,
    );
  }
}

export class InvalidPasswordException extends ValidationException {
  constructor(requirements?: string, path?: string) {
    super(
      'Password does not meet requirements',
      requirements ? [{ field: 'password', message: requirements }] : [],
      path,
    );
  }
}

export class DuplicateEntityException extends ValidationException {
  constructor(entityType: string, field: string, value: string, path?: string) {
    super(
      `${entityType} with this ${field} already exists`,
      [{ field, message: `${entityType} already exists`, value }],
      path,
    );
  }
}

export class DuplicateEmailException extends DuplicateEntityException {
  constructor(email: string, path?: string) {
    super('User', 'email', email, path);
  }
}
