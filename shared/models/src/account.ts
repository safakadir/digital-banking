import { AccountStatus } from './account-status';

/**
 * Account model
 */
export interface Account {
  accountId: string;
  userId: string;
  name: string;
  currency: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}
