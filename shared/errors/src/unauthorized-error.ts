import { BaseError } from './base-error';

/**
 * Error class for unauthorized errors
 */
export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401);
  }
}
