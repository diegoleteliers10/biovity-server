// Base exception
export { DomainException } from './domain.exception';

// Not Found exceptions
export {
  NotFoundException,
  UserNotFoundException,
  OrganizationNotFoundException,
  JobNotFoundException,
  ApplicationNotFoundException,
  ResumeNotFoundException,
} from './not-found.exception';

// Validation exceptions
export {
  ValidationException,
  ValidationError,
  InvalidEmailException,
  InvalidPasswordException,
  DuplicateEntityException,
  DuplicateEmailException,
} from './validation.exception';

// Authorization exceptions
export {
  UnauthorizedException,
  ForbiddenException,
  InvalidCredentialsException,
  TokenExpiredException,
  InvalidTokenException,
  InsufficientPermissionsException,
  EmailNotVerifiedException,
  AccountInactiveException,
} from './unauthorized.exception';
