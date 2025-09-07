import { SuccessResponse } from './success-response';

/**
 * Response model for initiated operations (deposit/withdraw)
 */
export interface OperationInitiatedResponse extends SuccessResponse {
  operationId: string;
  status: 'pending';
}
