import {
  ArgumentsHost,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
} from './http-exception.filter';
import { ValidationException } from '../errors';

const hostOf = (request: { url: string; requestId?: string }) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  it('formats an HttpException into the shared error envelope', () => {
    const { host, status, json } = hostOf({
      url: '/api/v1/jobs/1',
      requestId: 'req-1',
    });
    const exception = new ValidationException('Validation failed', [], '/x');

    new HttpExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        path: '/api/v1/jobs/1',
        requestId: 'req-1',
      }),
    );
  });

  it('keeps string responses from plain HttpExceptions', () => {
    const { host, status, json } = hostOf({ url: '/x' });
    const exception = new UnauthorizedException(
      'Se requiere una sesión válida.',
    );

    new HttpExceptionFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Se requiere una sesión válida.' }),
    );
  });
});

describe('AllExceptionsFilter', () => {
  it('answers a generic 500 and never leaks the error detail', () => {
    jest.spyOn(console, 'error').mockImplementation();
    const { host, status, json } = hostOf({
      url: '/api/v1/jobs',
      requestId: 'req-2',
    });

    new AllExceptionsFilter().catch(new Error('db password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = (json.mock.calls as unknown[][])[0][0] as Record<
      string,
      unknown
    >;
    expect(body['statusCode']).toBe(500);
    expect(body['message']).toBe('Internal server error');
    expect(body['requestId']).toBe('req-2');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
