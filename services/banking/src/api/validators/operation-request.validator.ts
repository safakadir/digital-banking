import { APIGatewayProxyEvent } from 'aws-lambda';
import { ValidationError } from '@digital-banking/errors';

/**
 * Validator for operation request
 * @param event - API Gateway event
 */
export const validateOperationRequest = (event: APIGatewayProxyEvent): void => {
  const operationId = event.pathParameters?.operation_id;

  if (!operationId) {
    throw new ValidationError('Operation ID is required');
  }

  // Validate operation ID format (UUID v4)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    throw new ValidationError('Invalid operation ID format');
  }
};
