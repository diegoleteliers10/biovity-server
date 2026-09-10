import { validateEnv } from './env.validation';

const validEnv = {
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'secret',
  DB_NAME: 'biovity',
  BETTER_AUTH_SECRET: 'auth-secret',
  INTERNAL_API_KEY: 'internal-key',
  AI_ENCRYPTION_KEY: 'encryption-key',
  RESEND_API_KEY: 're_key',
};

describe('validateEnv', () => {
  it('returns the parsed config with defaults applied', () => {
    jest.spyOn(console, 'warn').mockImplementation();

    const env = validateEnv({ ...validEnv });

    expect(env['NODE_ENV']).toBe('development');
    expect(env['PORT']).toBe(3001);
    expect(env['DB_PORT']).toBe(5432);
  });

  it('throws and names every missing required variable', () => {
    expect(() => validateEnv({})).toThrow(
      /DB_HOST[\s\S]*DB_PORT[\s\S]*RESEND_API_KEY/s,
    );
  });

  it('throws when a numeric variable is not a number', () => {
    expect(() => validateEnv({ ...validEnv, DB_PORT: 'not-a-number' })).toThrow(
      /DB_PORT/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('does not warn for missing Mercado Pago keys outside production', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    validateEnv({ ...validEnv, ADMIN_EMAILS: 'admin@biovity.cl' });

    const messages = warnSpy.mock.calls.map(call => call.join(' '));
    expect(messages.some(m => m.includes('MERCADO_PAGO'))).toBe(false);
    warnSpy.mockRestore();
  });

  it('warns when Mercado Pago keys are missing in production', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    validateEnv({ ...validEnv, NODE_ENV: 'production' });

    const messages = warnSpy.mock.calls.map(call => call.join(' '));
    expect(messages.some(m => m.includes('MERCADO_PAGO_ACCESS_TOKEN'))).toBe(
      true,
    );
    warnSpy.mockRestore();
  });

  it('warns when ADMIN_EMAILS is empty', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    validateEnv({ ...validEnv });

    const messages = warnSpy.mock.calls.map(call => call.join(' '));
    expect(messages.some(m => m.includes('ADMIN_EMAILS'))).toBe(true);
    warnSpy.mockRestore();
  });
});
