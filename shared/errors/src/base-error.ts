/**
 * Base error class for all application errors
 */
export abstract class BaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;

    // This is needed for proper instanceof checks with custom errors
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
