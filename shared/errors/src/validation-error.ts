import { BaseError } from './base-error';

/**
 * Error class for validation errors
 */
export class ValidationError extends BaseError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
  }
}
