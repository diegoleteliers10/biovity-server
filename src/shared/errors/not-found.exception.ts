import { DomainException } from './domain.exception';

export class NotFoundException extends DomainException {
  constructor(resource: string, identifier?: string | number, path?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, path);
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor(userId?: string, path?: string) {
    super('User', userId, path);
  }
}

export class OrganizationNotFoundException extends NotFoundException {
  constructor(organizationId?: string, path?: string) {
    super('Organization', organizationId, path);
  }
}

export class JobNotFoundException extends NotFoundException {
  constructor(jobId?: string, path?: string) {
    super('Job', jobId, path);
  }
}

export class ApplicationNotFoundException extends NotFoundException {
  constructor(applicationId?: string, path?: string) {
    super('Application', applicationId, path);
  }
}

export class ResumeNotFoundException extends NotFoundException {
  constructor(resumeId?: string, path?: string) {
    super('Resume', resumeId, path);
  }
}
