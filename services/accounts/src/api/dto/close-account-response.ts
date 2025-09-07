import { SuccessResponse } from '@digital-banking/models';

/**
 * Response DTO for close account endpoint
 */
export interface CloseAccountResponse extends SuccessResponse {
  accountId: string;
}
