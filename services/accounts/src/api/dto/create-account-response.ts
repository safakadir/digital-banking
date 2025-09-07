import { SuccessResponse, Account } from '@digital-banking/models';

/**
 * Response DTO for create account endpoint
 */
export interface CreateAccountResponse extends SuccessResponse {
  accountId: string;
  userId: string;
  name: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
