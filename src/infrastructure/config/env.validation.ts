import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3001),

    DB_HOST: z.string().min(1),
    DB_PORT: z.coerce.number().int().positive(),
    DB_USERNAME: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_NAME: z.string().min(1),
    WEB_APP_URL: z.string().url().optional(),
    GOOGLE_CALENDAR_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CALENDAR_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CALENDAR_REDIRECT_URI: z.string().url().optional(),

    BETTER_AUTH_SECRET: z.string().min(1),
    INTERNAL_API_KEY: z.string().min(1),
    AI_ENCRYPTION_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_OUTBOX_DISPATCH_URL: z.string().url().optional(),
    OFFER_RESPONSE_EMAIL_DISPATCH_URL: z.string().url().optional(),
    ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL: z.string().url().optional(),
    EMAIL_OUTBOX_SECRET: z.string().min(1).optional(),

    EMAIL_FROM: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),
    APP_VERSION: z.string().optional(),
    COMMIT_HASH: z.string().optional(),
    REGION: z.string().optional(),
    INSTANCE_ID: z.string().optional(),

    THROTTLE_LIMIT: z.coerce.number().int().positive().optional(),
    THROTTLE_SUBSCRIPTION_LIMIT: z.coerce.number().int().positive().optional(),
    THROTTLE_SENSITIVE_LIMIT: z.coerce.number().int().positive().optional(),
  })
  .refine(
    env => {
      const calendarValues = [
        env.GOOGLE_CALENDAR_CLIENT_ID,
        env.GOOGLE_CALENDAR_CLIENT_SECRET,
        env.GOOGLE_CALENDAR_REDIRECT_URI,
      ];
      return (
        calendarValues.every(value => !value) || calendarValues.every(Boolean)
      );
    },
    {
      message: 'Google Calendar OAuth settings must be configured together.',
      path: ['GOOGLE_CALENDAR_CLIENT_ID'],
    },
  );

export type Env = z.infer<typeof envSchema>;

const OPTIONAL_FEATURE_KEYS = [
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MP_SUCCESS_URL',
  'MP_FAILURE_URL',
  'MP_PENDING_URL',
  'MP_WEBHOOK_URL',
] as const;

/**
 * THROW. EXCEPTIONAL CASE
 * REASON: `@nestjs/config` requires `validate` to throw to abort the boot of
 * the app. Missing security-critical env is unrecoverable (AGENTS-58 fail fast).
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. Fix these and restart:\n${issues}`,
    );
  }

  warnAboutOptionalFeatureKeys(config);

  return result.data;
}

function warnAboutOptionalFeatureKeys(config: Record<string, unknown>): void {
  const warnings: string[] = [];

  if (!config['ADMIN_EMAILS']) {
    warnings.push(
      'ADMIN_EMAILS is empty: no admins are recognized through the env fallback. Set user.type="admin" in the database or fill ADMIN_EMAILS.',
    );
  }

  if (!config['EMAIL_OUTBOX_DISPATCH_URL'] || !config['EMAIL_OUTBOX_SECRET']) {
    warnings.push(
      'EMAIL_OUTBOX_DISPATCH_URL and EMAIL_OUTBOX_SECRET are not set: Next.js email outbox retries are disabled.',
    );
  }
  if (
    !config['OFFER_RESPONSE_EMAIL_DISPATCH_URL'] ||
    !config['EMAIL_OUTBOX_SECRET']
  ) {
    warnings.push(
      'OFFER_RESPONSE_EMAIL_DISPATCH_URL and EMAIL_OUTBOX_SECRET are not set: offer response email retries are disabled.',
    );
  }
  if (
    !config['ORGANIZATION_VERIFICATION_EMAIL_DISPATCH_URL'] ||
    !config['EMAIL_OUTBOX_SECRET']
  ) {
    warnings.push(
      'Organization verification email dispatch is not configured. Intents remain pending until both dispatch settings are set.',
    );
  }

  if (config['NODE_ENV'] === 'production') {
    for (const key of OPTIONAL_FEATURE_KEYS) {
      if (!config[key]) {
        warnings.push(
          `${key} is not set in production: the Mercado Pago feature that uses it is disabled.`,
        );
      }
    }
  }

  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }
}
