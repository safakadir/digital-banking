/**
 * Balance model for account balance queries
 */
export interface Balance {
  accountId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
}
