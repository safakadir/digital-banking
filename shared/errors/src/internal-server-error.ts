import { BaseError } from './base-error';

/**
 * Error class for internal server errors
 */
export class InternalServerError extends BaseError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}
