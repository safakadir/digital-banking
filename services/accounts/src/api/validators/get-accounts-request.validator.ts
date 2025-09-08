import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@digital-banking/errors';

/**
 * Validator for get accounts request
 * @param event - API Gateway event
 */
export const validateGetAccountsRequest = (event: APIGatewayProxyEvent): void => {
  // Extract user ID from Cognito authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }
};
