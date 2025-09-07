import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@digital-banking/errors';

/**
 * Validator for account ID path parameter
 * @param event - API Gateway event
 */
export const validateAccountIdParam = (event: APIGatewayProxyEvent): void => {
  const accountId = event.pathParameters?.account_id;
  
  if (!accountId) {
    throw new ValidationError('Account ID is required');
  }
  
  // Validate account ID format (assuming our format is acc_<uuid without dashes>)
  if (!/^acc_[a-f0-9]{32}$/.test(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
};
