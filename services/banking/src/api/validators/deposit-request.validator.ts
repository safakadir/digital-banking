import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@digital-banking/errors';

/**
 * Validator for deposit request
 * @param event - API Gateway event
 */
export const validateDepositRequest = (event: APIGatewayProxyEvent): void => {
  // Extract user ID from Cognito authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    throw new ValidationError('User authentication required');
  }

  // Parse and validate request body
  const body = (event.body || {}) as any;

  if (!body.accountId) {
    throw new ValidationError('Account ID is required');
  }

  // Validate account ID format (assuming our format is acc_<uuid without dashes>)
  if (typeof body.accountId !== 'string' || !/^acc_[a-f0-9]{32}$/.test(body.accountId)) {
    throw new ValidationError('Invalid account ID format');
  }

  if (!body.amount) {
    throw new ValidationError('Amount is required');
  }

  if (typeof body.amount !== 'number' || body.amount <= 0) {
    throw new ValidationError('Amount must be a positive number');
  }

  // Validate amount precision (max 2 decimal places for currency)
  if (Math.round(body.amount * 100) !== body.amount * 100) {
    throw new ValidationError('Amount cannot have more than 2 decimal places');
  }

  // Validate amount range (max 1 million for single transaction)
  if (body.amount > 1000000) {
    throw new ValidationError('Amount cannot exceed 1,000,000 per transaction');
  }
};
