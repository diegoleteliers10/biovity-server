import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, skipping SessionAuthGuard when the guard is
 * applied at controller level.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
