export abstract class DomainException extends Error {
  public readonly statusCode: number;
  public readonly timestamp: string;
  public readonly path?: string;

  constructor(message: string, statusCode: number = 500, path?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.path = path;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert exception to JSON format for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      statusCode: this.statusCode,
      message: this.message,
      timestamp: this.timestamp,
      path: this.path,
      name: this.name,
    };
  }
}
