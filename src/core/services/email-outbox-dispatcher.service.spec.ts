import { EmailOutboxDispatcherService } from './email-outbox-dispatcher.service';

describe('EmailOutboxDispatcherService', () => {
  const originalUrl = process.env.EMAIL_OUTBOX_DISPATCH_URL;
  const originalSecret = process.env.EMAIL_OUTBOX_SECRET;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EMAIL_OUTBOX_DISPATCH_URL;
    else process.env.EMAIL_OUTBOX_DISPATCH_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.EMAIL_OUTBOX_SECRET;
    else process.env.EMAIL_OUTBOX_SECRET = originalSecret;
    jest.restoreAllMocks();
  });

  it('rejects when its internal contract is not configured', async () => {
    delete process.env.EMAIL_OUTBOX_DISPATCH_URL;
    delete process.env.EMAIL_OUTBOX_SECRET;
    const fetch = jest.spyOn(global, 'fetch');

    await expect(new EmailOutboxDispatcherService().dispatch()).rejects.toThrow(
      'Email outbox dispatch is not configured',
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls the worker with the shared bearer secret', async () => {
    process.env.EMAIL_OUTBOX_DISPATCH_URL =
      'https://biovity.example/api/cron/email-outbox';
    process.env.EMAIL_OUTBOX_SECRET = 'test-secret';
    const fetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await new EmailOutboxDispatcherService().dispatch();

    expect(fetch).toHaveBeenCalledWith(
      'https://biovity.example/api/cron/email-outbox',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-secret' },
      }),
    );
  });

  it('rejects when the worker returns a non-success response', async () => {
    process.env.EMAIL_OUTBOX_DISPATCH_URL =
      'https://biovity.example/api/cron/email-outbox';
    process.env.EMAIL_OUTBOX_SECRET = 'test-secret';
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(new EmailOutboxDispatcherService().dispatch()).rejects.toThrow(
      'Email outbox dispatch returned HTTP 503',
    );
  });

  it('rejects when the worker request fails', async () => {
    process.env.EMAIL_OUTBOX_DISPATCH_URL =
      'https://biovity.example/api/cron/email-outbox';
    process.env.EMAIL_OUTBOX_SECRET = 'test-secret';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(new EmailOutboxDispatcherService().dispatch()).rejects.toThrow(
      'Email outbox dispatch request failed: Error: network down',
    );
  });
});
