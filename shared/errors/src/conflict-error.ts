import { BaseError } from './base-error';

/**
 * Error class for conflict errors
 */
export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, 409);
  }
}
