import { Account } from '@digital-banking/models';

/**
 * Response DTO for get accounts endpoint
 */
export interface GetAccountsResponse {
  accounts: Account[];
}
