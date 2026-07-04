import { HttpException } from '@nestjs/common';

export abstract class DomainException extends HttpException {
  public readonly timestamp: string;
  public readonly path?: string;

  constructor(message: string, statusCode: number = 500, path?: string) {
    super(message, statusCode);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.path = path;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      statusCode: this.getStatus(),
      message: this.message,
      timestamp: this.timestamp,
      path: this.path,
      name: this.name,
    };
  }
}
