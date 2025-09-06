import { BaseError } from './base-error';

/**
 * Error class for not found errors
 */
export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
  }
}
