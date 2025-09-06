import { AccountStatus } from './account-status';

/**
 * Account summary (for list responses)
 */
export interface AccountSummary {
  accountId: string;
  name: string;
  currency: string;
  status: AccountStatus;
  createdAt: string;
}
