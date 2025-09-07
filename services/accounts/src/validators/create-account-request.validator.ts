import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@digital-banking/errors';

/**
 * Validator for create account request
 * @param event - API Gateway event
 */
export const validateCreateAccountRequest = (event: APIGatewayProxyEvent): void => {
  // Extract user ID from Cognito authorizer context
  const userId = event.requestContext.authorizer?.claims?.sub;
  
  if (!userId) {
    throw new ValidationError('User ID is required');
  }
  
  // Parse and validate request body
  const body = event.body ? JSON.parse(event.body) : {};
  
  if (!body.name) {
    throw new ValidationError('Account name is required');
  }
  
  if (body.name && (typeof body.name !== 'string' || body.name.trim().length < 3)) {
    throw new ValidationError('Account name must be at least 3 characters');
  }
  
  if (!body.currency) {
    throw new ValidationError('Currency is required');
  }
  
  // Validate currency format (assuming ISO 4217 3-letter code)
  if (body.currency && (typeof body.currency !== 'string' || !/^[A-Z]{3}$/.test(body.currency))) {
    throw new ValidationError('Currency must be a valid 3-letter ISO currency code (e.g., USD, EUR, TRY)');
  }
};
