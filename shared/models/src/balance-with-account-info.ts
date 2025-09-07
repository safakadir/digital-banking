import { Balance } from './balance';

/**
 * Balance model with account info for listing user balances
 */
export interface BalanceWithAccountInfo extends Balance {
  accountName: string;
}
