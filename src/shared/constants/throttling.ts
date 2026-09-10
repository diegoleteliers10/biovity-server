// Per-minute request limits for ThrottlerGuard (AGENTS-78). The tracker is
// per-instance; these values are an abuse shield, not a quota.
// Override per environment with THROTTLE_LIMIT (global),
// THROTTLE_SUBSCRIPTION_LIMIT and THROTTLE_SENSITIVE_LIMIT.
export const THROTTLE_TTL_MS = 60_000;

const positiveInt = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const DEFAULT_THROTTLE_LIMIT = positiveInt(
  process.env.THROTTLE_LIMIT,
  120,
);
export const THROTTLE_SUBSCRIPTION_LIMIT = positiveInt(
  process.env.THROTTLE_SUBSCRIPTION_LIMIT,
  30,
);
export const THROTTLE_SENSITIVE_LIMIT = positiveInt(
  process.env.THROTTLE_SENSITIVE_LIMIT,
  20,
);
