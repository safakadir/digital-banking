import { BaseError } from './base-error';

/**
 * Error class for forbidden errors
 */
export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403);
  }
}
